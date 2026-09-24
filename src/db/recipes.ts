import { db, newId } from './db';
import { claimMedia } from './media';
import type { CookLog, Ingredient, Media, Recipe, Step } from './types';

export type NewRecipe = Partial<Recipe> & { title: string };

function cleanIngredients(list: Partial<Ingredient>[] | undefined): Ingredient[] {
  return (list ?? [])
    .filter((i) => (i.name ?? '').trim() !== '')
    .map((i) => {
      const out: Ingredient = { id: i.id ?? newId(), name: i.name!.trim() };
      if (i.quantity !== undefined && i.quantity !== null) out.quantity = i.quantity;
      if (i.unit) out.unit = i.unit;
      if (i.note?.trim()) out.note = i.note.trim();
      if (i.section?.trim()) out.section = i.section.trim();
      return out;
    });
}

function cleanSteps(list: Partial<Step>[] | undefined): Step[] {
  return (list ?? [])
    .filter((s) => (s.text ?? '').trim() !== '' || s.photoId)
    .map((s) => {
      const out: Step = { id: s.id ?? newId(), text: (s.text ?? '').trim() };
      if (s.timerSeconds) out.timerSeconds = s.timerSeconds;
      if (s.photoId) out.photoId = s.photoId;
      return out;
    });
}

/** Fill in defaults and tidy a partial recipe into a complete one. */
export function normalizeRecipe(input: Partial<Recipe>, now = Date.now()): Recipe {
  const story = (input.story ?? []).filter((s) => s.answer.trim() !== '' || s.audioId);
  const recipe: Recipe = {
    id: input.id ?? newId(),
    title: (input.title ?? '').trim() || 'Untitled recipe',
    author: (input.author ?? '').trim(),
    lang: input.lang ?? 'en',
    tags: [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))],
    collectionIds: input.collectionIds ?? [],
    ingredients: cleanIngredients(input.ingredients),
    steps: cleanSteps(input.steps),
    photoIds: input.photoIds ?? [],
    originalCardPhotoIds: input.originalCardPhotoIds ?? [],
    voiceNoteIds: input.voiceNoteIds ?? [],
    source: input.source ?? 'typed',
    cookedCount: input.cookedCount ?? 0,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  const optional = [
    'description',
    'servings',
    'prepMinutes',
    'cookMinutes',
    'tips',
    'transcript',
    'sourceUrl',
    'forkedFromId',
    'lastCookedAt',
  ] as const;
  for (const key of optional) {
    const v = input[key];
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))) continue;
    (recipe as unknown as Record<string, unknown>)[key] = typeof v === 'string' ? v.trim() : v;
  }
  if (story.length) recipe.story = story;
  return recipe;
}

/** Every media id a recipe refers to. */
export function mediaIdsOf(r: Partial<Recipe>): string[] {
  return [
    ...(r.photoIds ?? []),
    ...(r.originalCardPhotoIds ?? []),
    ...(r.voiceNoteIds ?? []),
    ...(r.steps ?? []).flatMap((s) => (s.photoId ? [s.photoId] : [])),
    ...(r.story ?? []).flatMap((s) => (s.audioId ? [s.audioId] : [])),
  ];
}

export function listRecipes(): Promise<Recipe[]> {
  return db.recipes.orderBy('updatedAt').reverse().toArray();
}

export function getRecipe(id: string): Promise<Recipe | undefined> {
  return db.recipes.get(id);
}

export function countRecipes(): Promise<number> {
  return db.recipes.count();
}

/** Create or replace a recipe. Returns the saved recipe. */
export async function saveRecipe(input: Partial<Recipe>): Promise<Recipe> {
  const existing = input.id ? await db.recipes.get(input.id) : undefined;
  const recipe = normalizeRecipe({ ...existing, ...input, createdAt: existing?.createdAt ?? input.createdAt });
  await db.transaction('rw', db.recipes, db.media, async () => {
    await db.recipes.put(recipe);
    await claimMedia(mediaIdsOf(recipe), recipe.id);
  });
  return recipe;
}

export async function updateRecipe(id: string, patch: Partial<Recipe>): Promise<void> {
  await db.recipes.update(id, { ...patch, updatedAt: Date.now() });
}

export interface RecipeSnapshot {
  recipe: Recipe;
  media: Media[];
  logs: CookLog[];
}

/** Delete a recipe with its media and cook log. Returns a snapshot for Undo. */
export async function deleteRecipe(id: string): Promise<RecipeSnapshot | undefined> {
  return db.transaction('rw', [db.recipes, db.media, db.cookLogs], async () => {
    const recipe = await db.recipes.get(id);
    if (!recipe) return undefined;
    const media = await db.media.where('recipeId').equals(id).toArray();
    const logs = await db.cookLogs.where('recipeId').equals(id).toArray();
    await db.media.where('recipeId').equals(id).delete();
    await db.cookLogs.where('recipeId').equals(id).delete();
    await db.recipes.delete(id);
    return { recipe, media, logs };
  });
}

export async function restoreRecipe(snapshot: RecipeSnapshot): Promise<void> {
  await db.transaction('rw', [db.recipes, db.media, db.cookLogs], async () => {
    await db.recipes.put(snapshot.recipe);
    await db.media.bulkPut(snapshot.media);
    await db.cookLogs.bulkPut(snapshot.logs);
  });
}

/** "Make my version": copy a recipe, pointing back at the original. Media is shared by id. */
export async function forkRecipe(id: string, author: string): Promise<Recipe> {
  const original = await db.recipes.get(id);
  if (!original) throw new Error('Recipe not found');
  const now = Date.now();
  const copyId = newId();
  // Photos are copied so each recipe owns its media (deleting one never breaks the other).
  const copies = new Map<string, Media>();
  for (const mid of [...original.photoIds, ...original.steps.flatMap((s) => (s.photoId ? [s.photoId] : []))]) {
    const m = await db.media.get(mid);
    if (m) copies.set(mid, { ...m, id: newId(), recipeId: copyId, createdAt: now });
  }
  const remap = (mid: string | undefined) => (mid ? copies.get(mid)?.id : undefined);
  const copy = normalizeRecipe(
    {
      ...original,
      id: copyId,
      author,
      forkedFromId: original.id,
      source: original.source,
      cookedCount: 0,
      lastCookedAt: undefined,
      createdAt: now,
      photoIds: original.photoIds.map(remap).filter((x): x is string => !!x),
      ingredients: original.ingredients.map((i) => ({ ...i, id: newId() })),
      steps: original.steps.map((s) => ({ ...s, id: newId(), photoId: remap(s.photoId) })),
      // Keepsakes (voice notes, card photos, transcript, story) belong to the original.
      voiceNoteIds: [],
      originalCardPhotoIds: [],
      transcript: undefined,
      story: undefined,
    },
    now,
  );
  await db.transaction('rw', db.recipes, db.media, async () => {
    await db.media.bulkAdd([...copies.values()]);
    await db.recipes.add(copy);
  });
  return copy;
}

export function listForks(id: string): Promise<Recipe[]> {
  return db.recipes.where('forkedFromId').equals(id).toArray();
}

export async function allTags(): Promise<string[]> {
  const keys = await db.recipes.orderBy('tags').uniqueKeys();
  return (keys as string[]).sort((a, b) => a.localeCompare(b));
}

export async function allAuthors(): Promise<string[]> {
  const keys = await db.recipes.orderBy('author').uniqueKeys();
  return (keys as string[]).filter(Boolean);
}

/** Ingredient names across the cookbook, most used first (for autocomplete). */
export async function knownIngredientNames(): Promise<string[]> {
  const counts = new Map<string, number>();
  await db.recipes.each((r) => {
    for (const i of r.ingredients) {
      const k = i.name.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

// Cook log ("I made it")

export async function logCook(entry: Omit<CookLog, 'id'>): Promise<CookLog> {
  const log: CookLog = { ...entry, id: newId() };
  await db.transaction('rw', db.cookLogs, db.recipes, db.media, async () => {
    await db.cookLogs.add(log);
    const r = await db.recipes.get(entry.recipeId);
    if (r) await db.recipes.update(r.id, { cookedCount: r.cookedCount + 1, lastCookedAt: entry.cookedAt });
    if (log.photoId) await claimMedia([log.photoId], entry.recipeId);
  });
  return log;
}

export function listCookLogs(recipeId: string): Promise<CookLog[]> {
  return db.cookLogs.where('recipeId').equals(recipeId).reverse().sortBy('cookedAt');
}

export async function deleteCookLog(id: string): Promise<CookLog | undefined> {
  return db.transaction('rw', db.cookLogs, db.recipes, async () => {
    const log = await db.cookLogs.get(id);
    if (!log) return undefined;
    await db.cookLogs.delete(id);
    const r = await db.recipes.get(log.recipeId);
    if (r) {
      const remaining = await db.cookLogs.where('recipeId').equals(r.id).sortBy('cookedAt');
      await db.recipes.update(r.id, { cookedCount: Math.max(0, r.cookedCount - 1), lastCookedAt: remaining.at(-1)?.cookedAt });
    }
    return log;
  });
}
