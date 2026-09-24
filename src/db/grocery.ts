import { parseIngredient } from '../lib/parse/ingredient';
import { mergeIntoList, type IncomingIngredient } from '../lib/parse/merge';
import { db, newId } from './db';
import type { GroceryItem } from './types';

export function listGrocery(): Promise<GroceryItem[]> {
  return db.grocery.orderBy('order').toArray();
}

/** Add ingredients (already scaled) to the list, merging duplicates. */
export async function addToGrocery(ingredients: IncomingIngredient[], recipeId?: string): Promise<void> {
  await db.transaction('rw', db.grocery, async () => {
    const list = await db.grocery.orderBy('order').toArray();
    let order = (list.at(-1)?.order ?? 0) + 1;
    const merged = mergeIntoList(list, ingredients, recipeId, (item) => ({
      id: newId(),
      checked: false,
      order: order++,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      aisle: item.aisle,
      fromRecipeIds: item.fromRecipeIds,
    }));
    await db.grocery.bulkPut(merged.map(stripUndefined));
  });
}

function stripUndefined(item: GroceryItem): GroceryItem {
  const out = { ...item };
  for (const k of Object.keys(out) as (keyof GroceryItem)[]) if (out[k] === undefined) delete out[k];
  return out;
}

/** A typed item ("2 lemons") is parsed and merged like any other. */
export async function addManualItem(text: string): Promise<void> {
  const parsed = parseIngredient(text);
  if (!parsed.name) return;
  await addToGrocery([parsed]);
}

export async function setChecked(id: string, checked: boolean): Promise<void> {
  await db.grocery.update(id, { checked });
}

export async function removeGroceryItems(ids: string[]): Promise<GroceryItem[]> {
  const rows = (await db.grocery.bulkGet(ids)).filter((r): r is GroceryItem => !!r);
  await db.grocery.bulkDelete(ids);
  return rows;
}

/** Remove checked items. Returns them for Undo. */
export async function clearChecked(): Promise<GroceryItem[]> {
  const checked = (await db.grocery.toArray()).filter((i) => i.checked);
  await db.grocery.bulkDelete(checked.map((i) => i.id));
  return checked;
}

export async function restoreGroceryItems(items: GroceryItem[]): Promise<void> {
  await db.grocery.bulkPut(items);
}
