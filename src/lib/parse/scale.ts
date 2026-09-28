import { mapQuantity, roundNice } from './numbers';
import { getUnit } from './units';
import type { ParsedIngredient, Quantity } from './types';

/** Round a scaled amount to something you'd measure: 1½ cups, 250 g, 3 onions. */
export function roundForUnit(n: number, unitId: string | undefined): number {
  const unit = getUnit(unitId);
  if (unit && unit.system === 'metric') {
    if (unit.id === 'g' || unit.id === 'ml') {
      if (n >= 100) return Math.round(n / 10) * 10;
      if (n >= 20) return Math.round(n / 5) * 5;
      return Math.max(1, Math.round(n));
    }
    return Math.round(n * 100) / 100 >= 1 ? roundNice(n) : Math.round(n * 1000) / 1000;
  }
  return roundNice(n);
}

export function scaleQuantity(q: Quantity, factor: number, unitId?: string): Quantity {
  return mapQuantity(q, (n) => roundForUnit(n * factor, unitId));
}

/** When a scaled amount drops below this, say it in the smaller unit: ⅔ kg → 670 g, ⅔ tbsp → 2 tsp. */
const SMALLER: Record<string, { unit: string; times: number; below: number }> = {
  kg: { unit: 'g', times: 1000, below: 1 },
  l: { unit: 'ml', times: 1000, below: 1 },
  tbsp: { unit: 'tsp', times: 3, below: 1 },
  cup: { unit: 'tbsp', times: 16, below: 0.25 },
};

/** Scale an ingredient; vague amounts ("a pinch", "to taste") stay as they are. */
export function scaleIngredient<T extends ParsedIngredient>(ing: T, factor: number): T {
  if (factor === 1 || ing.quantity === undefined) return ing;
  if (getUnit(ing.unit)?.vague) return ing;
  const smaller = ing.unit ? SMALLER[ing.unit] : undefined;
  const scaled = mapQuantity(ing.quantity, (n) => n * factor);
  if (smaller && (Array.isArray(scaled) ? scaled[1] : scaled) < smaller.below) {
    return { ...ing, unit: smaller.unit, quantity: mapQuantity(scaled, (n) => roundForUnit(n * smaller.times, smaller.unit)) };
  }
  return { ...ing, quantity: mapQuantity(scaled, (n) => roundForUnit(n, ing.unit)) };
}

export function scaleIngredients<T extends ParsedIngredient>(list: T[], from: number | undefined, to: number): T[] {
  if (!from || from === to) return list;
  return list.map((i) => scaleIngredient(i, to / from));
}
