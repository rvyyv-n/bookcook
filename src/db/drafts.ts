import { db, newId } from './db';
import { getRecipe, mediaIdsOf, saveRecipe } from './recipes';
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
  return (await openEditDraft(recipe)).draft;
}

const opening = new Map<string, Promise<{ draft: Draft; fresh: boolean }>>();

/**
 * The edit draft for a recipe, and whether it was just made (an untouched fresh draft can be thrown
 * away on close; an older one holds edits from before). Two calls at once share one draft.
 */
export function openEditDraft(recipe: Recipe): Promise<{ draft: Draft; fresh: boolean }> {
  let pending = opening.get(recipe.id);
  if (!pending) {
    pending = (async () => {
      const existing = await db.drafts.where('recipeId').equals(recipe.id).first();
      if (existing) return { draft: existing, fresh: false };
      return { draft: await createDraft('edit', structuredClone(recipe), { recipeId: recipe.id }), fresh: true };
    })().finally(() => opening.delete(recipe.id));
    opening.set(recipe.id, pending);
  }
  return pending;
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
  // What the editor changes. The cook log count, collections and dates may have moved on while an
  // edit draft sat open, so those always come from the saved recipe.
  const { cookedCount: _c, lastCookedAt: _l, collectionIds: _ids, createdAt: _at, updatedAt: _u, ...edits } = draft.recipe;
  const previous = draft.recipeId ? await getRecipe(draft.recipeId) : undefined;
  const recipe = await saveRecipe({ ...(draft.recipeId ? edits : draft.recipe), id: draft.recipeId ?? draft.recipe.id, source });
  await db.drafts.delete(id);
  if (previous) {
    // Photos and notes the edit replaced or removed (the cook log's photos stay).
    const logs = await db.cookLogs.where('recipeId').equals(recipe.id).toArray();
    const kept = new Set([...mediaIdsOf(recipe), ...logs.flatMap((l) => (l.photoId ? [l.photoId] : []))]);
    await db.media.bulkDelete(mediaIdsOf(previous).filter((m) => !kept.has(m)));
  }
  if (draft.requestId) await fulfilRequest(draft.requestId, recipe.id);
  return recipe;
}
