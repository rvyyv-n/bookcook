import { Dexie, type EntityTable } from 'dexie';
import type { Collection, CookLog, Draft, GroceryItem, Media, Recipe, RecipeRequest, Setting } from './types';

/**
 * The local database. Only repositories in this folder may import it.
 * Schema versions are append-only: add a new `this.version(n)` with an upgrade, never edit an old one.
 */
export class BookcookDB extends Dexie {
  recipes!: EntityTable<Recipe, 'id'>;
  drafts!: EntityTable<Draft, 'id'>;
  cookLogs!: EntityTable<CookLog, 'id'>;
  grocery!: EntityTable<GroceryItem, 'id'>;
  requests!: EntityTable<RecipeRequest, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  media!: EntityTable<Media, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'bookcook') {
    super(name);
    this.version(1).stores({
      recipes: 'id, title, author, createdAt, updatedAt, lastCookedAt, cookedCount, *tags, *collectionIds, forkedFromId',
      drafts: 'id, updatedAt, recipeId',
      cookLogs: 'id, recipeId, cookedAt',
      grocery: 'id, order',
      requests: 'id, createdAt, fulfilledRecipeId',
      collections: 'id, order',
      media: 'id, recipeId, kind',
      settings: 'key',
    });
    // Design handoff: collections lose their emoji; requests gain a direction (old ones were all asked of you).
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('collections')
          .toCollection()
          .modify((c: Record<string, unknown>) => {
            delete c.emoji;
          });
        await tx
          .table('requests')
          .toCollection()
          .modify((r: Partial<RecipeRequest>) => {
            r.direction ??= 'incoming';
          });
      });
  }
}

export const db = new BookcookDB();

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Tests only: wipe every table. */
export async function resetDatabase(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}
