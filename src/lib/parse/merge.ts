import { aisleFor, ingredientKey, type Aisle } from './aisles';
import { quantityMax } from './numbers';
import { roundForUnit } from './scale';
import { getUnit } from './units';

export interface MergeableItem {
  name: string;
  quantity?: number;
  unit?: string;
  aisle?: Aisle | string;
  fromRecipeIds: string[];
}

export interface IncomingIngredient {
  name: string;
  quantity?: number | [number, number];
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

function add(aQty: number | undefined, aUnit: string | undefined, bQty: number | undefined, bUnit: string | undefined) {
  if (aQty === undefined || bQty === undefined) return { quantity: aQty ?? bQty, unit: aUnit ?? bUnit };
  const ua = getUnit(aUnit);
  const ub = getUnit(bUnit);
  if (!ua?.toBase || !ub?.toBase || ua.id === ub.id) return { quantity: roundForUnit(aQty + bQty, aUnit), unit: aUnit };
  // Express the sum in the larger of the two units.
  const big = ua.toBase >= ub.toBase ? ua : ub;
  const total = (aQty * ua.toBase + bQty * ub.toBase) / big.toBase!;
  return { quantity: roundForUnit(total, big.id), unit: big.id };
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
    const qty = ing.quantity === undefined ? undefined : quantityMax(ing.quantity);
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
