import { db, newId } from './db';
import type { Media, MediaKind } from './types';

export async function putMedia(blob: Blob, kind: MediaKind, recipeId?: string): Promise<string> {
  const id = newId();
  await db.media.add({
    id,
    kind,
    blob,
    mime: blob.type || (kind === 'photo' ? 'image/webp' : 'audio/webm'),
    recipeId,
    createdAt: Date.now(),
  });
  return id;
}

export function getMedia(id: string): Promise<Media | undefined> {
  return db.media.get(id);
}

export async function getMediaMany(ids: string[]): Promise<Media[]> {
  const rows = await db.media.bulkGet(ids);
  return rows.filter((r): r is Media => r !== undefined);
}

/** Attach loose media (captured before the recipe existed) to a recipe. */
export async function claimMedia(ids: string[], recipeId: string): Promise<void> {
  if (!ids.length) return;
  await db.media.where('id').anyOf(ids).modify({ recipeId });
}

export async function deleteMedia(ids: string[]): Promise<Media[]> {
  const rows = await getMediaMany(ids);
  await db.media.bulkDelete(ids);
  return rows;
}
