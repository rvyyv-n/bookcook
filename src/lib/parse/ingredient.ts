import { formatQuantity, quantityMax, readQuantity } from './numbers';
import { getUnit, readUnit, unitLabel, type UnitDef } from './units';
import type { ParsedIngredient, Quantity } from './types';

/** Bullets, numbering, checkboxes and markdown emphasis at the start of a line. */
export function stripListMarker(line: string): string {
  return line
    .replace(/(^|\s)[*_~]{1,3}([^*_~\s][^*_~]*?)[*_~]{1,3}(?=\s|$|[:.,!])/g, '$1$2')
    .replace(/^\s*(?:[-*•·▪◦‣⁃–—>▫■□●○◆◇➤➢→]|\[\s?[xX]?\s?\]|☐|✓|✔|✅|🔸|🔹|🔶|🔷|👉)[️‍]*(?:\s*[-*•·▪◦▫][️]*)*\s*/u, '')
    .replace(/^\s*\(?\d{1,2}[.)]\s+/, '')
    .replace(/^\s*step\s*\d{1,2}\s*[:.)-]?\s*/i, '')
    .trim();
}

const LEADING_FILLER =
  /^(?:(?:um+|uh+|er+|erm|okay|ok|so|and|then|also|plus|next|you(?:'ll| will)? need|we need|i use|i used|take|add|put|about|around|roughly|approximately|approx\.?|maybe|like|just|some|you know)\b[\s,]*)+/i;

const TRAILING_VAGUE = /[\s,;(-]+(to taste|as needed|as required|as per taste|according to taste)\)?\s*\.?$/i;
const OPTIONAL = /[\s,;(-]+\(?optional\)?\s*\.?$/i;

const PREP_WORDS = new Set([
  'chopped',
  'finely',
  'thinly',
  'roughly',
  'coarsely',
  'freshly',
  'sliced',
  'diced',
  'minced',
  'grated',
  'crushed',
  'washed',
  'soaked',
  'peeled',
  'deseeded',
  'halved',
  'quartered',
  'cubed',
  'julienned',
  'shredded',
  'melted',
  'softened',
  'beaten',
  'whisked',
  'rinsed',
  'drained',
  'trimmed',
  'cut',
  'torn',
  'pounded',
  'mashed',
  'cleaned',
  'cored',
  'zested',
  'juiced',
  'divided',
  'sifted',
  'toasted',
  'fried',
  'boiled',
  'warmed',
  'cooled',
  'separated',
  'hulled',
  'pitted',
  'skinned',
  'deboned',
]);

interface Parts {
  quantity?: Quantity;
  unit?: UnitDef;
  rest: string;
}

function readLeading(s: string): Parts {
  let quantity: Quantity | undefined;
  let rest = s;
  const q = readQuantity(rest);
  // A lone "a"/"an" only counts when a unit follows ("a cup of rice") or a noun ("an onion").
  if (q) {
    quantity = q.quantity;
    rest = rest.slice(q.length);
    // "1 (400g) can tomatoes" → keep the parenthetical for the note.
  }
  const notes: string[] = [];
  const p = /^\s*\(([^)]*)\)/.exec(rest);
  if (quantity !== undefined && p) {
    notes.push(p[1]!.trim());
    rest = rest.slice(p[0].length);
  }
  rest = rest.replace(/^\s*(?:x\s+)?/i, ' ');
  // "2 heaped tbsp", "1 x 400ml can": a size between the amount and the unit goes to the note.
  if (quantity !== undefined) {
    const size =
      /^\s*(heaped|heaping|level|rounded|scant|generous|small|large|big|medium|good|\d+(?:\.\d+)?\s*(?:g|ml|oz|kg|l|lb))\s+/i.exec(rest);
    if (size && readUnit(rest.slice(size[0].length))) {
      notes.push(size[1]!.toLowerCase());
      rest = ' ' + rest.slice(size[0].length);
    }
  }
  const u = readUnit(rest);
  let unit: UnitDef | undefined;
  if (u) {
    unit = u.unit;
    rest = rest.slice(u.length);
    const after = /^\s*\(([^)]*)\)/.exec(rest);
    if (after) {
      notes.push(after[1]!.trim());
      rest = rest.slice(after[0].length);
    }
    const each = /^\s*each(?:\s+of)?\b/i.exec(rest);
    if (each) {
      notes.push('each');
      rest = rest.slice(each[0].length);
    }
    // "a cup and a half of flour"
    const half = /^\s*and\s+a\s+half(?:\s+of)?\b/i.exec(rest);
    if (half && typeof quantity === 'number') {
      quantity += 0.5;
      rest = rest.slice(half[0].length);
    }
  }
  rest = rest.replace(/^\s*of\b/i, '');
  if (notes.length) rest = `${rest}, ${notes.join(', ')}`;
  return { quantity, unit, rest };
}

/** "Chicken - 1 kg", "Onions: 2", "Salt 1 tsp" (quantity after the name, as in WhatsApp lists). */
function readTrailing(s: string): Parts | null {
  const m = /^(.+?)(?:\s*[-–—:=,]\s*|\s+)([\d½¼¾⅓⅔⅛][\d\s./½¼¾⅓⅔⅛-]*)\s*([a-z. ]*?)\s*\.?$/i.exec(s);
  if (!m) return readTrailingWords(s);
  const q = readQuantity(m[2]!);
  if (!q || m[2]!.slice(q.length).trim() !== '') return null;
  let unit: UnitDef | undefined;
  if (m[3]!.trim()) {
    const u = readUnit(`${m[3]!} x`);
    if (!u || `${m[3]!} x`.slice(u.length).trim() !== 'x') return null;
    unit = u.unit;
  }
  return { quantity: q.quantity, unit, rest: m[1]! };
}

/** "Oil half cup", "Eggs a dozen": a spelled-out amount (and unit) after the name. */
function readTrailingWords(s: string): Parts | null {
  const words = s.replace(/\.$/, '').split(/\s+/);
  for (let k = Math.min(4, words.length - 1); k >= 1; k--) {
    const head = words
      .slice(0, -k)
      .join(' ')
      .replace(/\s*[-–—:=,]$/, '');
    const tail = words.slice(-k).join(' ');
    const q = readQuantity(tail);
    if (!q || /^(?:an?)\b/i.test(tail.slice(0, q.length).trim())) continue;
    const after = tail.slice(q.length);
    if (!after.trim()) return { quantity: q.quantity, rest: head };
    const u = readUnit(`${after} x`);
    if (u && `${after} x`.slice(u.length).trim() === 'x') return { quantity: q.quantity, unit: u.unit, rest: head };
  }
  return null;
}

function splitNote(rest: string): { name: string; note?: string } {
  let text = rest.trim().replace(/^[,;:\-–]\s*/, '');
  let note: string | undefined;

  const comma = /\s*[,;]\s*/.exec(text);
  if (comma && comma.index > 0) {
    note = text.slice(comma.index + comma[0].length);
    text = text.slice(0, comma.index);
  } else {
    const dash = /\s+[-–—]\s+/.exec(text);
    const paren = /\s*\(([^)]+)\)\s*$/.exec(text);
    if (dash && dash.index > 0) {
      note = text.slice(dash.index + dash[0].length);
      text = text.slice(0, dash.index);
    } else if (paren && paren.index > 0) {
      note = paren[1];
      text = text.slice(0, paren.index);
    } else {
      const words = text.split(/\s+/);
      const idx = words.findIndex((w, i) => i > 0 && PREP_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, '')));
      const joiner = /\s+(?:for|in)\s+/i.exec(text);
      if (idx > 0) {
        note = words.slice(idx).join(' ');
        text = words.slice(0, idx).join(' ');
      } else if (joiner && joiner.index > 0) {
        note = text.slice(joiner.index).trim();
        text = text.slice(0, joiner.index);
      }
    }
  }
  const name = text
    .replace(/^(?:the|of)\s+/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();
  note = note?.replace(/[.;]+$/, '').trim() || undefined;
  return { name, note };
}

/**
 * Parse one ingredient line, typed or spoken.
 * "two onions, finely chopped" → { quantity: 2, name: "onions", note: "finely chopped" }
 */
export function parseIngredient(line: string): ParsedIngredient {
  let s = stripListMarker(line).replace(/\s+/g, ' ').trim();
  s = s.replace(LEADING_FILLER, '').trim();

  let vague: UnitDef | undefined;
  const tv = TRAILING_VAGUE.exec(s);
  if (tv) {
    vague = getUnit('to taste');
    s = s.slice(0, tv.index).trim();
  }
  let optional = false;
  const opt = OPTIONAL.exec(s);
  if (opt) {
    optional = true;
    s = s.slice(0, opt.index).trim();
  }

  let parts = readLeading(s);
  if (parts.quantity === undefined && !parts.unit) {
    parts = readTrailing(s) ?? { rest: s };
  }
  // "a few" etc. read as a quantity but "a" followed by a non-noun ("a little salt") reads badly.
  const little = /^\s*(?:little|bit(?:\s+of)?)\b/i.exec(parts.rest);
  if (little && parts.quantity === 1 && !parts.unit) {
    parts = { rest: parts.rest.slice(little[0].length) };
  }

  let { name, note } = splitNote(parts.rest);
  let unit = parts.unit ?? vague;
  if (parts.unit && vague) note = note ? `${note}, to taste` : 'to taste';

  // "6 cloves" with nothing else: the unit word is the ingredient.
  if (!name && parts.unit && parts.unit.kind === 'count') {
    name = parts.unit.plural;
    unit = vague;
  }
  if (optional) note = note ? `${note}, optional` : 'optional';

  const result: ParsedIngredient = { name };
  // "Handful of spinach" reads as "a handful".
  if (parts.quantity === undefined && unit?.vague && !unit.trailing) result.quantity = 1;
  if (parts.quantity !== undefined) result.quantity = parts.quantity;
  if (unit) result.unit = unit.id;
  if (note) result.note = note;
  return result;
}

/** A line ending in ":" ("For the sauce:") is a section heading. */
export function sectionHeading(line: string): string | undefined {
  const s = stripListMarker(line).trim();
  const m = /^(.{1,60}?)\s*:$/.exec(s);
  if (!m) return undefined;
  const text = m[1]!.trim();
  if (readQuantity(text) && /\d/.test(text)) return undefined;
  return text;
}

export interface IngredientDisplay {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

/** Pieces for rendering: "2" · "cups" · "basmati rice" · "washed". */
export function ingredientParts(ing: Pick<ParsedIngredient, 'quantity' | 'unit' | 'name' | 'note'>): IngredientDisplay {
  const unit = getUnit(ing.unit);
  const amount = ing.quantity === undefined ? undefined : quantityMax(ing.quantity);
  let quantity = formatQuantity(ing.quantity);
  if (unit?.vague && ing.quantity === 1) quantity = 'a';
  return {
    quantity,
    unit: unit?.trailing ? '' : unitLabel(ing.unit, amount),
    name: ing.name,
    note: [unit?.trailing ? unit.singular : '', ing.note ?? ''].filter(Boolean).join(', '),
  };
}

/** "2 cups basmati rice, washed" */
export function formatIngredient(ing: Pick<ParsedIngredient, 'quantity' | 'unit' | 'name' | 'note'>): string {
  const p = ingredientParts(ing);
  const unit = getUnit(ing.unit);
  const head = [p.quantity, p.unit].filter(Boolean).join(' ');
  const of = unit?.vague && !unit.trailing && head ? ' of' : '';
  let text = [head + of, p.name].filter(Boolean).join(' ');
  if (unit?.trailing) {
    text = `${text} ${unit.singular}`;
    if (ing.note) text += `, ${ing.note}`;
  } else if (p.note) {
    text += `, ${p.note}`;
  }
  return text;
}
