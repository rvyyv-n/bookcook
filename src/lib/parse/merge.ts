import { aisleFor, ingredientKey, type Aisle } from './aisles';
import { mapQuantity } from './numbers';
import { roundForUnit } from './scale';
import type { Quantity } from './types';
import { getUnit } from './units';

export interface MergeableItem {
  name: string;
  quantity?: Quantity;
  unit?: string;
  aisle?: Aisle | string;
  fromRecipeIds: string[];
}

export interface IncomingIngredient {
  name: string;
  quantity?: Quantity;
  unit?: string;
}

function dimension(unitId: string | undefined): string {
  const u = getUnit(unitId);
  if (!u) return 'count';
  if (u.vague) return `vague:${u.id}`;
  if (u.kind === 'volume' || u.kind === 'mass') return u.kind;
  return `count:${u.id}`;
}

/** Can these two be added together? */
export function compatible(a: string | undefined, b: string | undefined): boolean {
  return dimension(a) === dimension(b);
}

/** Add two amounts end by end, so a range stays a range: 1–2 + 1 = 2–3. */
function sum(a: Quantity, b: Quantity): Quantity {
  if (!Array.isArray(a) && !Array.isArray(b)) return a + b;
  const [a0, a1] = Array.isArray(a) ? a : [a, a];
  const [b0, b1] = Array.isArray(b) ? b : [b, b];
  return [a0 + b0, a1 + b1];
}

function add(aQty: Quantity | undefined, aUnit: string | undefined, bQty: Quantity | undefined, bUnit: string | undefined) {
  if (aQty === undefined || bQty === undefined) return { quantity: aQty ?? bQty, unit: aUnit ?? bUnit };
  const ua = getUnit(aUnit);
  const ub = getUnit(bUnit);
  if (!ua?.toBase || !ub?.toBase || ua.id === ub.id) {
    return { quantity: mapQuantity(sum(aQty, bQty), (n) => roundForUnit(n, aUnit)), unit: aUnit };
  }
  // Express the sum in the larger of the two units.
  const big = ua.toBase >= ub.toBase ? ua : ub;
  const inBig = (q: Quantity, factor: number) => mapQuantity(q, (n) => (n * factor) / big.toBase!);
  const total = sum(inBig(aQty, ua.toBase), inBig(bQty, ub.toBase));
  return { quantity: mapQuantity(total, (n) => roundForUnit(n, big.id)), unit: big.id };
}

/**
 * Add ingredients to a grocery list: "2 onions" + "1 onion" = "3 onions".
 * Items with compatible units are combined; vague ones ("salt to taste") are kept once.
 */
export function mergeIntoList<T extends MergeableItem>(
  list: T[],
  incoming: IncomingIngredient[],
  recipeId: string | undefined,
  create: (item: MergeableItem) => T,
): T[] {
  const result = list.map((i) => ({ ...i }));
  for (const ing of incoming) {
    if (!ing.name.trim()) continue;
    const qty = ing.quantity;
    const unit = getUnit(ing.unit)?.vague ? undefined : ing.unit;
    const key = ingredientKey(ing.name);
    const match = result.find((r) => ingredientKey(r.name) === key && compatible(r.unit, unit) && !('checked' in r && r.checked));
    if (match) {
      const sum = getUnit(ing.unit)?.vague ? { quantity: match.quantity, unit: match.unit } : add(match.quantity, match.unit, qty, unit);
      match.quantity = sum.quantity;
      match.unit = sum.unit;
      if (recipeId && !match.fromRecipeIds.includes(recipeId)) match.fromRecipeIds = [...match.fromRecipeIds, recipeId];
    } else {
      result.push(
        create({
          name: ing.name.trim(),
          quantity: getUnit(ing.unit)?.vague ? undefined : qty,
          unit,
          aisle: aisleFor(ing.name),
          fromRecipeIds: recipeId ? [recipeId] : [],
        }),
      );
    }
  }
  return result;
}
