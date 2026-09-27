import { beforeEach, describe, expect, it } from 'vitest';
import { addCollection, deleteCollection, listCollections, restoreCollection } from './collections';
import { resetDatabase } from './db';
import { commitDraft, createDraft, deleteDraft, editDraftFor, getDraft, listDrafts, patchDraft, restoreDraft } from './drafts';
import { addManualItem, addToGrocery, clearChecked, listGrocery, restoreGroceryItems, setChecked } from './grocery';
import { getMedia, putMedia } from './media';
import {
  allTags,
  deleteCookLog,
  deleteRecipe,
  forkRecipe,
  getRecipe,
  listCookLogs,
  listForks,
  listRecipes,
  logCook,
  normalizeRecipe,
  restoreRecipe,
  saveRecipe,
} from './recipes';
import { addRequest, findOpenRequestsFor, listRequests } from './requests';
import { DEFAULT_SETTINGS, getSettings, setSetting } from './settings';

beforeEach(async () => {
  await resetDatabase();
});

const biryani = {
  title: "Mom's Chicken Biryani",
  author: 'Mom',
  servings: 6,
  tags: ['Rice', 'Eid'],
  ingredients: [
    { id: 'i1', quantity: 1, unit: 'kg', name: 'chicken' },
    { id: 'i2', quantity: 2, name: 'onions' },
  ],
  steps: [{ id: 's1', text: 'Mix the chicken with the yogurt.', timerSeconds: 1800 }],
};

describe('recipes', () => {
  it('normalizes partial input', () => {
    const r = normalizeRecipe({ title: '  ', ingredients: [{ id: 'x', name: ' ' }], tags: ['a', 'a', ' '] });
    expect(r.title).toBe('Untitled recipe');
    expect(r.ingredients).toEqual([]);
    expect(r.tags).toEqual(['a']);
    expect(r.lang).toBe('en');
    expect(r.cookedCount).toBe(0);
  });

  it('saves, lists and updates recipes', async () => {
    const saved = await saveRecipe(biryani);
    expect(await getRecipe(saved.id)).toMatchObject({ title: biryani.title, servings: 6 });
    await saveRecipe({ ...saved, title: 'Biryani' });
    const all = await listRecipes();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe('Biryani');
    expect(all[0]!.createdAt).toBe(saved.createdAt);
    expect(await allTags()).toEqual(['Eid', 'Rice']);
  });

  it('deletes with undo, including media and cook logs', async () => {
    const photo = await putMedia(new Blob(['x'], { type: 'image/webp' }), 'photo');
    const saved = await saveRecipe({ ...biryani, photoIds: [photo] });
    expect((await getMedia(photo))?.recipeId).toBe(saved.id);
    await logCook({ recipeId: saved.id, cookedAt: 1, note: 'less chilli' });

    const snapshot = await deleteRecipe(saved.id);
    expect(await getRecipe(saved.id)).toBeUndefined();
    expect(await getMedia(photo)).toBeUndefined();

    await restoreRecipe(snapshot!);
    expect(await getRecipe(saved.id)).toBeDefined();
    expect(await getMedia(photo)).toBeDefined();
    expect(await listCookLogs(saved.id)).toHaveLength(1);
  });

  it('forks with a link back and its own copies of photos', async () => {
    const photo = await putMedia(new Blob(['x']), 'photo');
    const original = await saveRecipe({ ...biryani, photoIds: [photo], transcript: 'okay so', voiceNoteIds: [] });
    const fork = await forkRecipe(original.id, 'Me');
    expect(fork.forkedFromId).toBe(original.id);
    expect(fork.author).toBe('Me');
    expect(fork.transcript).toBeUndefined();
    expect(fork.photoIds).toHaveLength(1);
    expect(fork.photoIds[0]).not.toBe(photo);
    expect((await listForks(original.id)).map((r) => r.id)).toEqual([fork.id]);
    await deleteRecipe(original.id);
    expect(await getMedia(fork.photoIds[0]!)).toBeDefined();
  });

  it('logs cooking and updates counts', async () => {
    const r = await saveRecipe(biryani);
    const a = await logCook({ recipeId: r.id, cookedAt: 100, rating: 5 });
    await logCook({ recipeId: r.id, cookedAt: 200 });
    expect(await getRecipe(r.id)).toMatchObject({ cookedCount: 2, lastCookedAt: 200 });
    expect((await listCookLogs(r.id)).map((l) => l.cookedAt)).toEqual([200, 100]);
    await deleteCookLog(a.id);
    expect(await getRecipe(r.id)).toMatchObject({ cookedCount: 1, lastCookedAt: 200 });
  });
});

describe('drafts', () => {
  it('creates, patches and commits a draft', async () => {
    const d = await createDraft('type', { title: 'Soup' });
    await patchDraft(d.id, { recipe: { title: 'Lentil soup', steps: [{ id: 's', text: 'Boil.' }] } });
    expect((await listDrafts()).map((x) => x.id)).toEqual([d.id]);
    const recipe = await commitDraft(d.id);
    expect(recipe).toMatchObject({ title: 'Lentil soup', source: 'typed' });
    expect(await getDraft(d.id)).toBeUndefined();
  });

  it('keeps edit drafts out of "Continue your draft" and saves over the original', async () => {
    const r = await saveRecipe(biryani);
    const d = await editDraftFor(r);
    expect(await listDrafts()).toEqual([]);
    expect((await editDraftFor(r)).id).toBe(d.id);
    await patchDraft(d.id, { recipe: { ...d.recipe, title: 'Better biryani' } });
    const saved = await commitDraft(d.id);
    expect(saved.id).toBe(r.id);
    expect((await listRecipes()).map((x) => x.title)).toEqual(['Better biryani']);
  });

  it('fulfils the request a draft was started from', async () => {
    const req = await addRequest({ title: 'Nihari', direction: 'incoming', requestedBy: 'Rayyan' });
    const d = await createDraft('tell', { title: 'Nihari' }, { requestId: req.id });
    const recipe = await commitDraft(d.id);
    expect((await listRequests())[0]!.fulfilledRecipeId).toBe(recipe.id);
  });

  it('deletes with undo and cleans up loose media', async () => {
    const note = await putMedia(new Blob(['a']), 'audio');
    const d = await createDraft('tell', { voiceNoteIds: [note] });
    const removed = await deleteDraft(d.id);
    expect(await getMedia(note)).toBeUndefined();
    await restoreDraft(removed!);
    expect(await getDraft(d.id)).toBeDefined();
  });
});

describe('grocery', () => {
  it('merges ingredients from two recipes and remembers where they came from', async () => {
    await addToGrocery(
      [
        { name: 'onions', quantity: 2 },
        { name: 'chicken', quantity: 500, unit: 'g' },
      ],
      'a',
    );
    await addToGrocery(
      [
        { name: 'onion', quantity: 1 },
        { name: 'chicken', quantity: 1, unit: 'kg' },
      ],
      'b',
    );
    const list = await listGrocery();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ name: 'onions', quantity: 3, aisle: 'Produce', fromRecipeIds: ['a', 'b'] });
    expect(list[1]).toMatchObject({ quantity: 1.5, unit: 'kg', aisle: 'Meat & fish' });
  });

  it('keeps ranges when merging', async () => {
    await addToGrocery([{ name: 'lemons', quantity: [1, 2] }], 'a');
    await addToGrocery([{ name: 'lemon', quantity: 1 }], 'b');
    await addToGrocery([{ name: 'milk', quantity: 500, unit: 'ml' }], 'a');
    await addToGrocery([{ name: 'milk', quantity: [1, 2], unit: 'l' }], 'b');
    const [lemons, milk] = await listGrocery();
    expect(lemons).toMatchObject({ quantity: [2, 3] });
    expect(milk).toMatchObject({ quantity: [1.5, 2.5], unit: 'l' });
  });

  it('adds manual items and clears checked ones with undo', async () => {
    await addManualItem('2 lemons');
    await addManualItem('bin bags');
    const [lemons] = await listGrocery();
    expect(lemons).toMatchObject({ name: 'lemons', quantity: 2 });
    await setChecked(lemons!.id, true);
    const removed = await clearChecked();
    expect((await listGrocery()).map((i) => i.name)).toEqual(['bin bags']);
    await restoreGroceryItems(removed);
    expect(await listGrocery()).toHaveLength(2);
  });
});

describe('requests', () => {
  it('matches open requests to a recipe title', async () => {
    await addRequest({ title: "Mom's biryani", direction: 'incoming', requestedBy: 'Rayyan' });
    await addRequest({ title: 'Nihari', direction: 'incoming' });
    await addRequest({ title: "Nani's biryani", direction: 'outgoing', askedOf: 'Nani' });
    expect((await findOpenRequestsFor('Chicken Biryani')).map((r) => r.title)).toEqual(["Mom's biryani"]);
    expect(await findOpenRequestsFor('Pancakes')).toEqual([]);
  });
});

describe('collections', () => {
  it('deletes a collection from recipes with undo', async () => {
    const c = await addCollection("Mom's classics");
    const r = await saveRecipe({ ...biryani, collectionIds: [c.id] });
    const snap = await deleteCollection(c.id);
    expect((await getRecipe(r.id))!.collectionIds).toEqual([]);
    await restoreCollection(snap!);
    expect((await getRecipe(r.id))!.collectionIds).toEqual([c.id]);
    expect(await listCollections()).toHaveLength(1);
  });
});

describe('settings', () => {
  it('returns defaults and stores changes', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    await setSetting('textSize', 'huge');
    expect((await getSettings()).textSize).toBe('huge');
  });
});
