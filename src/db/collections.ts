import { db, newId } from './db';
import type { Collection } from './types';

export function listCollections(): Promise<Collection[]> {
  return db.collections.orderBy('order').toArray();
}

export async function addCollection(name: string): Promise<Collection> {
  const last = await db.collections.orderBy('order').last();
  const c: Collection = { id: newId(), name: name.trim(), order: (last?.order ?? 0) + 1 };
  await db.collections.add(c);
  return c;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await db.collections.update(id, { name: name.trim() });
}

/** Delete a collection and take it off every recipe. Returns what's needed for Undo. */
export async function deleteCollection(id: string): Promise<{ collection: Collection; recipeIds: string[] } | undefined> {
  return db.transaction('rw', db.collections, db.recipes, async () => {
    const collection = await db.collections.get(id);
    if (!collection) return undefined;
    const recipes = await db.recipes.where('collectionIds').equals(id).toArray();
    for (const r of recipes) await db.recipes.update(r.id, { collectionIds: r.collectionIds.filter((c) => c !== id) });
    await db.collections.delete(id);
    return { collection, recipeIds: recipes.map((r) => r.id) };
  });
}

export async function restoreCollection(snapshot: { collection: Collection; recipeIds: string[] }): Promise<void> {
  await db.transaction('rw', db.collections, db.recipes, async () => {
    await db.collections.put(snapshot.collection);
    for (const id of snapshot.recipeIds) {
      const r = await db.recipes.get(id);
      if (r && !r.collectionIds.includes(snapshot.collection.id)) {
        await db.recipes.update(id, { collectionIds: [...r.collectionIds, snapshot.collection.id] });
      }
    }
  });
}

export async function setRecipeCollections(recipeId: string, collectionIds: string[]): Promise<void> {
  await db.recipes.update(recipeId, { collectionIds });
}
