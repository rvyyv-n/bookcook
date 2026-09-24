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

/** Scale an ingredient; vague amounts ("a pinch", "to taste") stay as they are. */
export function scaleIngredient<T extends ParsedIngredient>(ing: T, factor: number): T {
  if (factor === 1 || ing.quantity === undefined) return ing;
  if (getUnit(ing.unit)?.vague) return ing;
  return { ...ing, quantity: scaleQuantity(ing.quantity, factor, ing.unit) };
}

export function scaleIngredients<T extends ParsedIngredient>(list: T[], from: number | undefined, to: number): T[] {
  if (!from || from === to) return list;
  return list.map((i) => scaleIngredient(i, to / from));
}
