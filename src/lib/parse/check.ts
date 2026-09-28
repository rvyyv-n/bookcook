import { parseIngredient } from './ingredient';
import { readUnit } from './units';
import type { ParseCheck, ParsedIngredient } from './types';

/** A written amount with a unit after it ("2 tbsp", "400 g"). */
const AMOUNT = /(?<![\p{L}\p{N}])(?:\d+(?:[.,/]\d+)?|[½¼¾⅓⅔⅛])\s*/gu;

function hasAmount(text: string): boolean {
  AMOUNT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT.exec(text))) {
    if (readUnit(text.slice(m.index + m[0].length))) return true;
  }
  return false;
}

/**
 * Whether a parsed ingredient line needs a second look on Review, and why:
 * - `twoAmounts`: another amount hides in the name or note ("a pinch saffron in 2 tbsp warm milk").
 * - `unclear`: no name, or a whole sentence rather than an ingredient.
 * Amounts in brackets ("1 (400 g) can tomatoes") are a size, not a second amount.
 */
export function checkIngredient(line: string, parsed: ParsedIngredient = parseIngredient(line)): ParseCheck | undefined {
  const words = (s: string | undefined) => (s?.trim() ? s.trim().split(/\s+/).length : 0);
  const sentence = words(parsed.name) > 6 || (parsed.quantity === undefined && !parsed.unit && words(parsed.name) + words(parsed.note) > 7);
  if (!parsed.name.trim() || sentence) return { reason: 'unclear', heard: line.trim() };
  const unbracketed = parseIngredient(line.replace(/\([^)]*\)/g, ' '));
  if (hasAmount(`${unbracketed.name} ${unbracketed.note ?? ''}`)) return { reason: 'twoAmounts' };
  return undefined;
}
