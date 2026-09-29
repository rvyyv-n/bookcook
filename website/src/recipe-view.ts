/** Laying out a parsed ingredient the way the app does: "3 cups | basmati rice, washed", "to taste | salt". */
import { ingredientParts } from '../../src/lib/parse/ingredient';
import type { ParsedIngredient } from '../../src/lib/parse/types';
import { getUnit } from '../../src/lib/parse/units';

export function columns(ing: ParsedIngredient) {
  const unit = getUnit(ing.unit);
  if (unit?.trailing) return { amount: unit.singular, name: ing.name, note: ing.note ?? '' };
  const p = ingredientParts(ing);
  return { amount: [p.quantity, p.unit].filter(Boolean).join(' '), name: p.name, note: p.note };
}

export function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
}
