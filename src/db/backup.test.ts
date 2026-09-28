// @vitest-environment node
// Node's Blob survives fake-indexeddb's structured clone with its bytes; jsdom's does not.
import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, exportBackup, restoreBackup } from './backup';
import { resetDatabase } from './db';
import { addManualItem, listGrocery } from './grocery';
import { getMedia, putMedia } from './media';
import { getRecipe, listRecipes, saveRecipe } from './recipes';
import { addRequest, listRequests } from './requests';
import { getSettings, setSetting } from './settings';

beforeEach(async () => {
  await resetDatabase();
});

describe('backup', () => {
  it('round-trips recipes, photos, grocery, requests and settings through a cleared database', async () => {
    const recipe = await saveRecipe({ title: 'Nihari', author: 'Nani', ingredients: [], steps: [] });
    const photo = await putMedia(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'photo', recipe.id);
    await addManualItem('2 lemons');
    await addRequest({ title: 'Karahi', direction: 'incoming', requestedBy: 'Rayyan' });
    await setSetting('cookbookTitle', 'Nani’s Kitchen');

    const { blob, filename, counts } = await exportBackup(Date.UTC(2026, 8, 28));
    expect(filename).toBe('bookcook-2026-09-28.bookcook');
    expect(counts).toEqual({ recipes: 1, media: 1 });
    expect((await getSettings()).lastBackupAt).toBe(Date.UTC(2026, 8, 28));

    await resetDatabase();
    expect(await listRecipes()).toEqual([]);

    expect(await restoreBackup(blob)).toEqual({ recipes: 1, media: 1 });
    expect((await getRecipe(recipe.id))?.title).toBe('Nihari');
    const media = await getMedia(photo);
    expect(new Uint8Array(await media!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(media!.blob.type).toBe('image/jpeg');
    expect((await listGrocery()).map((g) => g.name)).toEqual(['lemons']);
    expect((await listRequests()).map((r) => r.title)).toEqual(['Karahi']);
    const settings = await getSettings();
    expect(settings.cookbookTitle).toBe('Nani’s Kitchen');
    // This device hasn't backed up since the wipe; the file doesn't say otherwise.
    expect(settings.lastBackupAt).toBeNull();
  });

  it('merges: recipes added since the backup stay', async () => {
    await saveRecipe({ title: 'Old', author: 'Me', ingredients: [], steps: [] });
    const { blob } = await exportBackup();
    await saveRecipe({ title: 'New', author: 'Me', ingredients: [], steps: [] });
    await restoreBackup(blob);
    expect((await listRecipes()).map((r) => r.title).sort()).toEqual(['New', 'Old']);
  });

  it('refuses a file that is not a backup', async () => {
    await expect(restoreBackup(new Blob(['hello']))).rejects.toBeInstanceOf(BackupError);
  });
});
