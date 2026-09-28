import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { db } from './db';
import type { Collection, CookLog, Draft, GroceryItem, Media, Recipe, RecipeRequest, Setting } from './types';

/**
 * Backups: a `.bookcook` file, which is a zip of `bookcook.json` (every table) plus each photo and
 * voice note under `media/`. Restoring either merges (everything in the file is put back by id,
 * and anything added since stays) or replaces (the cookbook becomes exactly what the file holds).
 */

const FORMAT = 'bookcook-backup';
const VERSION = 1;
/** Settings that describe this device, not the cookbook, so a restore leaves them alone. */
const LOCAL_SETTINGS = new Set(['lastBackupAt', 'persistRequested']);

interface MediaEntry extends Omit<Media, 'blob'> {
  file: string;
}

export interface Manifest {
  format: typeof FORMAT;
  version: number;
  exportedAt: number;
  recipes: Recipe[];
  drafts: Draft[];
  cookLogs: CookLog[];
  grocery: GroceryItem[];
  requests: RecipeRequest[];
  collections: Collection[];
  settings: Setting[];
  media: MediaEntry[];
}

export interface BackupCounts {
  recipes: number;
  media: number;
}

async function bytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** The whole cookbook as a `.bookcook` file. Records the time as the last backup. */
export async function exportBackup(now = Date.now()): Promise<{ blob: Blob; filename: string; counts: BackupCounts }> {
  const [recipes, drafts, cookLogs, grocery, requests, collections, settings, media] = await Promise.all([
    db.recipes.toArray(),
    db.drafts.toArray(),
    db.cookLogs.toArray(),
    db.grocery.toArray(),
    db.requests.toArray(),
    db.collections.toArray(),
    db.settings.toArray(),
    db.media.toArray(),
  ]);
  const files: Record<string, Uint8Array> = {};
  const entries: MediaEntry[] = [];
  for (const { blob, ...rest } of media) {
    const file = `media/${rest.id}`;
    files[file] = await bytes(blob);
    entries.push({ ...rest, file });
  }
  const manifest: Manifest = {
    format: FORMAT,
    version: VERSION,
    exportedAt: now,
    recipes,
    drafts,
    cookLogs,
    grocery,
    requests,
    collections,
    settings: settings.filter((s) => !LOCAL_SETTINGS.has(s.key)),
    media: entries,
  };
  files['bookcook.json'] = strToU8(JSON.stringify(manifest));
  // Photos and audio are already compressed; storing them as they are keeps the export quick.
  const zip = zipSync(files, { level: 0 });
  await db.settings.put({ key: 'lastBackupAt', value: now });
  const day = new Date(now).toISOString().slice(0, 10);
  return {
    blob: new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
    filename: `bookcook-${day}.bookcook`,
    counts: { recipes: recipes.length, media: media.length },
  };
}

export class BackupError extends Error {}

const list = <T>(v: T[] | undefined) => (Array.isArray(v) ? v : []);

export type RestoreMode = 'merge' | 'replace';

/** A backup file that has been read and checked, ready to restore. */
export interface BackupFile {
  exportedAt: number;
  counts: BackupCounts;
  manifest: Manifest;
  media: Media[];
}

/** Read and check a `.bookcook` file without changing anything. Throws BackupError if it isn't one. */
export async function readBackup(file: Blob): Promise<BackupFile> {
  let files: Record<string, Uint8Array>;
  let manifest: Manifest;
  try {
    files = unzipSync(await bytes(file));
    manifest = JSON.parse(strFromU8(files['bookcook.json']!)) as Manifest;
  } catch {
    throw new BackupError('not a backup');
  }
  if (manifest?.format !== FORMAT || typeof manifest.version !== 'number') throw new BackupError('not a backup');
  if (manifest.version > VERSION) throw new BackupError('newer version');

  const media: Media[] = [];
  for (const { file: path, ...rest } of list(manifest.media)) {
    const data = files[path];
    if (data) media.push({ ...rest, blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: rest.mime }) });
  }
  return { exportedAt: manifest.exportedAt, counts: { recipes: list(manifest.recipes).length, media: media.length }, manifest, media };
}

/** Put a backup back: merged into the cookbook, or replacing it (this device's own settings stay). */
export async function applyBackup({ manifest, media, counts }: BackupFile, mode: RestoreMode): Promise<BackupCounts> {
  const tables = [db.recipes, db.drafts, db.cookLogs, db.grocery, db.requests, db.collections, db.settings, db.media];
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all(tables.filter((table) => table !== db.settings).map((table) => table.clear()));
      await db.settings
        .where('key')
        .noneOf([...LOCAL_SETTINGS])
        .delete();
    }
    await db.recipes.bulkPut(list(manifest.recipes));
    await db.drafts.bulkPut(list(manifest.drafts));
    await db.cookLogs.bulkPut(list(manifest.cookLogs));
    await db.grocery.bulkPut(list(manifest.grocery));
    await db.requests.bulkPut(list(manifest.requests));
    await db.collections.bulkPut(list(manifest.collections));
    await db.settings.bulkPut(list(manifest.settings).filter((s) => !LOCAL_SETTINGS.has(s.key)));
    await db.media.bulkPut(media);
  });
  return counts;
}

/** Read a `.bookcook` file and restore it in one go. */
export async function restoreBackup(file: Blob, mode: RestoreMode = 'merge'): Promise<BackupCounts> {
  return applyBackup(await readBackup(file), mode);
}
