import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { db } from './db';
import type { Collection, CookLog, Draft, GroceryItem, Media, Recipe, RecipeRequest, Setting } from './types';

/**
 * Backups: a `.bookcook` file, which is a zip of `bookcook.json` (every table) plus each photo and
 * voice note under `media/`. Restoring merges: everything in the file is put back by id, and
 * anything added since stays.
 */

const FORMAT = 'bookcook-backup';
const VERSION = 1;
/** Settings that describe this device, not the cookbook, so a restore leaves them alone. */
const LOCAL_SETTINGS = new Set(['lastBackupAt', 'persistRequested']);

interface MediaEntry extends Omit<Media, 'blob'> {
  file: string;
}

interface Manifest {
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

/** Read a `.bookcook` file and merge it into the cookbook. Throws BackupError if it isn't one. */
export async function restoreBackup(file: Blob): Promise<BackupCounts> {
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
  for (const { file: path, ...rest } of manifest.media ?? []) {
    const data = files[path];
    if (data) media.push({ ...rest, blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: rest.mime }) });
  }
  const list = <T>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  await db.transaction(
    'rw',
    [db.recipes, db.drafts, db.cookLogs, db.grocery, db.requests, db.collections, db.settings, db.media],
    async () => {
      await db.recipes.bulkPut(list(manifest.recipes));
      await db.drafts.bulkPut(list(manifest.drafts));
      await db.cookLogs.bulkPut(list(manifest.cookLogs));
      await db.grocery.bulkPut(list(manifest.grocery));
      await db.requests.bulkPut(list(manifest.requests));
      await db.collections.bulkPut(list(manifest.collections));
      await db.settings.bulkPut(list(manifest.settings).filter((s) => !LOCAL_SETTINGS.has(s.key)));
      await db.media.bulkPut(media);
    },
  );
  return { recipes: list(manifest.recipes).length, media: media.length };
}

/** Ask the browser not to clear our storage under pressure (these recipes can't be replaced). */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const granted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist());
  await db.settings.put({ key: 'persistRequested', value: true });
  return granted;
}
