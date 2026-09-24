import { mapQuantity, quantityMax, roundNice } from './numbers';
import { getUnit } from './units';
import type { ParsedIngredient, Quantity } from './types';

export type MeasureSystem = 'metric' | 'imperial';

function roundMetric(n: number): number {
  if (n >= 1000) return Math.round(n / 50) * 50;
  if (n >= 100) return Math.round(n / 10) * 10;
  if (n >= 20) return Math.round(n / 5) * 5;
  return Math.max(1, Math.round(n));
}

function pickMetric(base: number, kind: 'volume' | 'mass'): { unit: string; amount: number } {
  if (kind === 'mass')
    return base >= 1000 ? { unit: 'kg', amount: Math.round((base / 1000) * 100) / 100 } : { unit: 'g', amount: roundMetric(base) };
  return base >= 1000 ? { unit: 'l', amount: Math.round((base / 1000) * 100) / 100 } : { unit: 'ml', amount: roundMetric(base) };
}

function pickImperial(base: number, kind: 'volume' | 'mass'): { unit: string; amount: number } {
  if (kind === 'mass') {
    const oz = base / 28.3495;
    return oz >= 16 ? { unit: 'lb', amount: roundNice(oz / 16) } : { unit: 'oz', amount: roundNice(oz) };
  }
  const tsp = base / 5;
  if (tsp < 3) return { unit: 'tsp', amount: roundNice(tsp) };
  if (base < 60) return { unit: 'tbsp', amount: roundNice(base / 15) };
  return { unit: 'cup', amount: roundNice(base / 240) };
}

/**
 * Convert an ingredient to metric or imperial with kitchen-friendly rounding.
 * Spoons, counts and vague amounts stay as they are.
 */
export function convertIngredient<T extends ParsedIngredient>(ing: T, to: MeasureSystem): T {
  const unit = getUnit(ing.unit);
  if (!unit || !unit.toBase || ing.quantity === undefined || unit.vague) return ing;
  if (unit.kind !== 'volume' && unit.kind !== 'mass') return ing;
  if (unit.system === 'neutral' || unit.system === to) return ing;

  const kind = unit.kind;
  const pick = to === 'metric' ? pickMetric : pickImperial;
  // Choose the target unit from the largest amount so a range shares one unit.
  const target = pick(quantityMax(ing.quantity) * unit.toBase, kind);
  const targetDef = getUnit(target.unit)!;
  const quantity: Quantity = mapQuantity(ing.quantity, (n) => {
    const base = n * unit.toBase!;
    const amount = base / targetDef.toBase!;
    return to === 'metric' ? (targetDef.toBase === 1 ? roundMetric(amount) : Math.round(amount * 100) / 100) : roundNice(amount);
  });
  return { ...ing, quantity, unit: target.unit };
}

/** Which system a recipe mostly uses, so the toggle starts in the right place. */
export function dominantSystem(ings: ParsedIngredient[]): MeasureSystem {
  let metric = 0;
  let imperial = 0;
  for (const i of ings) {
    const s = getUnit(i.unit)?.system;
    if (s === 'metric') metric++;
    if (s === 'imperial') imperial++;
  }
  return imperial > metric ? 'imperial' : 'metric';
}
