import { db, newId } from './db';
import { mediaIdsOf, saveRecipe } from './recipes';
import { fulfilRequest } from './requests';
import type { Draft, DraftMode, Recipe } from './types';

export async function createDraft(mode: DraftMode, recipe: Partial<Recipe> = {}, extra: Partial<Draft> = {}): Promise<Draft> {
  const draft: Draft = { id: newId(), mode, recipe, updatedAt: Date.now(), ...extra };
  await db.drafts.add(draft);
  return draft;
}

export function getDraft(id: string): Promise<Draft | undefined> {
  return db.drafts.get(id);
}

/** Drafts for new recipes (not edits of existing ones), newest first. */
export async function listDrafts(): Promise<Draft[]> {
  const all = await db.drafts.orderBy('updatedAt').reverse().toArray();
  return all.filter((d) => d.mode !== 'edit');
}

export async function saveDraft(draft: Draft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: Date.now() });
}

export async function patchDraft(id: string, patch: Partial<Draft>): Promise<void> {
  await db.drafts.update(id, { ...patch, updatedAt: Date.now() });
}

/** The edit draft for an existing recipe, creating it from the saved recipe if needed. */
export async function editDraftFor(recipe: Recipe): Promise<Draft> {
  const existing = await db.drafts.where('recipeId').equals(recipe.id).first();
  if (existing) return existing;
  return createDraft('edit', structuredClone(recipe), { recipeId: recipe.id });
}

/** Delete a draft. Returns it for Undo. Media captured only for this draft is removed too. */
export async function deleteDraft(id: string, { keepMedia = false } = {}): Promise<Draft | undefined> {
  return db.transaction('rw', db.drafts, db.media, async () => {
    const draft = await db.drafts.get(id);
    if (!draft) return undefined;
    await db.drafts.delete(id);
    if (!keepMedia && draft.mode !== 'edit') {
      const loose = await db.media.bulkGet(mediaIdsOf(draft.recipe));
      await db.media.bulkDelete(loose.filter((m) => m && !m.recipeId).map((m) => m!.id));
    }
    return draft;
  });
}

export async function restoreDraft(draft: Draft): Promise<void> {
  await db.drafts.put(draft);
}

/** Turn a draft into a saved recipe and remove the draft. */
export async function commitDraft(id: string): Promise<Recipe> {
  const draft = await db.drafts.get(id);
  if (!draft) throw new Error('Draft not found');
  const source: Recipe['source'] =
    draft.recipe.source ??
    ({ tell: 'voice', talk: 'voice', type: 'typed', paste: 'pasted', link: 'web', edit: 'typed' } as const)[draft.mode];
  const recipe = await saveRecipe({ ...draft.recipe, id: draft.recipeId ?? draft.recipe.id, source });
  await db.drafts.delete(id);
  if (draft.requestId) await fulfilRequest(draft.requestId, recipe.id);
  return recipe;
}
