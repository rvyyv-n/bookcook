import type { Quantity } from './types';

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};
const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** Fraction words after "and a" / "and three" etc. */
const FRACTION_WORDS: [RegExp, number][] = [
  [/(?:a |one )?half\b/y, 1 / 2],
  [/(?:a |one )?quarter\b/y, 1 / 4],
  [/three[ -]quarters?\b/y, 3 / 4],
  [/(?:a |one )?third\b/y, 1 / 3],
  [/two[ -]thirds\b/y, 2 / 3],
  [/(?:an |one )?eighth\b/y, 1 / 8],
];

interface Match {
  value: number;
  end: number;
}

function sticky(re: RegExp, s: string, pos: number): RegExpExecArray | null {
  const r = new RegExp(re.source, 'y' + (re.flags.includes('i') ? 'i' : ''));
  r.lastIndex = pos;
  return r.exec(s);
}

function skipSpace(s: string, pos: number): number {
  while (pos < s.length && /\s/.test(s[pos]!)) pos++;
  return pos;
}

/** "and a half", "and 1/2", "and three quarters" after a whole number. */
function readAndFraction(s: string, pos: number): Match | null {
  const m = sticky(/\s+and\s+/, s, pos);
  if (!m) return null;
  const at = pos + m[0].length;
  for (const [re, value] of FRACTION_WORDS) {
    const f = sticky(re, s, at);
    if (f) return { value, end: at + f[0].length };
  }
  const digits = sticky(/(\d+)\s*\/\s*(\d+)/, s, at);
  if (digits) {
    const value = Number(digits[1]) / Number(digits[2]);
    if (Number.isFinite(value) && value < 1) return { value, end: at + digits[0].length };
  }
  const uni = sticky(new RegExp(`[${FRACTION_CHARS}]`), s, at);
  if (uni) return { value: UNICODE_FRACTIONS[uni[0]]!, end: at + 1 };
  return null;
}

function readDigits(s: string, pos: number): Match | null {
  let m = sticky(/(\d+)\s+(\d+)\s*\/\s*(\d+)(?![\d/])/, s, pos);
  if (m && Number(m[3]) !== 0) {
    return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), end: pos + m[0].length };
  }
  m = sticky(new RegExp(`(\\d+)\\s*([${FRACTION_CHARS}])`), s, pos);
  if (m) return { value: Number(m[1]) + UNICODE_FRACTIONS[m[2]!]!, end: pos + m[0].length };
  m = sticky(/(\d+)\s*\/\s*(\d+)(?![\d/])/, s, pos);
  if (m && Number(m[2]) !== 0) return { value: Number(m[1]) / Number(m[2]), end: pos + m[0].length };
  m = sticky(/(\d+(?:[.,]\d+)?|\.\d+)(?![\d/])/, s, pos);
  if (m) {
    // "1,5" (European decimal) only when a single digit group follows; "1,000" stays a thousand.
    const raw = /^\d+,\d{3}$/.test(m[1]!) ? m[1]!.replace(',', '') : m[1]!.replace(',', '.');
    const whole: Match = { value: Number(raw), end: pos + m[0].length };
    const and = readAndFraction(s, whole.end);
    return and ? { value: whole.value + and.value, end: and.end } : whole;
  }
  m = sticky(new RegExp(`[${FRACTION_CHARS}]`), s, pos);
  if (m) return { value: UNICODE_FRACTIONS[m[0]]!, end: pos + 1 };
  return null;
}

/** "twenty five", "one hundred", "a hundred and twenty". */
function readWholeWords(s: string, pos: number): Match | null {
  let total = 0;
  let end = pos;
  let any = false;
  let cursor = pos;
  const word = () => sticky(/([a-z]+)(?:-([a-z]+))?\b/i, s, cursor);
  for (;;) {
    const m = word();
    if (!m) break;
    const w = m[1]!.toLowerCase();
    const w2 = m[2]?.toLowerCase();
    if (w in TENS) {
      total += TENS[w]!;
      if (w2 && w2 in UNITS && UNITS[w2]! < 10) total += UNITS[w2]!;
    } else if (w in UNITS && !w2) {
      if (any && total % 10 !== 0) break;
      if (any && total >= 20 && UNITS[w]! >= 10) break;
      total += UNITS[w]!;
    } else if (w === 'hundred' && any) {
      total *= 100;
    } else if (w === 'hundred' && !any) {
      break;
    } else {
      break;
    }
    any = true;
    end = cursor + m[0].length;
    cursor = skipSpace(s, end);
    // allow "a hundred and twenty"
    const and = sticky(/and\s+/, s, cursor);
    if (and && total >= 100 && total % 100 === 0) {
      const probe = cursor + and[0].length;
      const next = sticky(/([a-z]+)/i, s, probe);
      if (next && (next[1]!.toLowerCase() in UNITS || next[1]!.toLowerCase() in TENS)) cursor = probe;
    }
  }
  return any ? { value: total, end } : null;
}

/** One amount (no ranges). */
function readAmount(s: string, pos: number): Match | null {
  pos = skipSpace(s, pos);
  const digits = readDigits(s, pos);
  if (digits) return digits;

  // Special phrases, longest first.
  const phrases: [RegExp, number][] = [
    [/half\s+a\s+dozen\b/, 6],
    [/a\s+dozen\b/, 12],
    [/half\s+(?:a|an)\b/, 1 / 2],
    [/(?:a|one)\s+and\s+a\s+half\b/, 3 / 2],
    [/(?:a\s+)?couple(?:\s+of)?\b/, 2],
    [/(?:a|one)\s+half(?:\s+(?:a|an)\b)?/, 1 / 2],
    [/(?:a|one)\s+quarter(?:\s+of(?:\s+an?\b)?)?\b/, 1 / 4],
    [/three[ -]quarters?(?:\s+of(?:\s+an?\b)?)?\b/, 3 / 4],
    [/(?:a|one)\s+third(?:\s+of(?:\s+an?\b)?)?\b/, 1 / 3],
    [/two[ -]thirds(?:\s+of(?:\s+an?\b)?)?\b/, 2 / 3],
    [/(?:an|one)\s+eighth(?:\s+of(?:\s+an?\b)?)?\b/, 1 / 8],
    [/half\s+of\s+(?:a|an)\b/, 1 / 2],
    [/half\b/, 1 / 2],
    [/quarter\b/, 1 / 4],
  ];
  for (const [re, value] of phrases) {
    const m = sticky(re, s, pos);
    if (m) {
      const end = pos + m[0].length;
      if (value >= 1) {
        const and = readAndFraction(s, end);
        if (and) return { value: value + and.value, end: and.end };
      }
      return { value, end };
    }
  }

  const words = readWholeWords(s, pos);
  if (words) {
    const and = readAndFraction(s, words.end);
    return and ? { value: words.value + and.value, end: and.end } : words;
  }

  // "a"/"an" meaning one, only when something follows.
  const a = sticky(/(?:a|an)(?=\s+\S)/, s, pos);
  if (a) {
    const end = pos + a[0].length;
    const and = readAndFraction(s, end);
    // "a cup and a half" is handled by the ingredient parser; here only "an hour and a half" style.
    return and ? { value: 1 + and.value, end: and.end } : { value: 1, end };
  }
  return null;
}

export interface QuantityMatch {
  quantity: Quantity;
  /** Characters consumed from the start of the input (including leading whitespace). */
  length: number;
}

/**
 * Read a quantity at the start of `input`.
 * Handles "2", "1 1/2", "½", "1.5", "two and a half", "a quarter", "half a", "a couple of",
 * and ranges such as "1-2", "one to two", "2 or 3".
 */
export function readQuantity(input: string): QuantityMatch | null {
  const s = input.toLowerCase();
  const few = sticky(/\s*(?:a\s+)?few(?:\s+of)?\b/, s, 0);
  if (few) return { quantity: [2, 3], length: few[0].length };

  const first = readAmount(s, 0);
  if (!first) return null;

  const sep = sticky(/\s*(?:-|–|—|to|or)\s*/, s, first.end);
  if (sep) {
    const second = readAmount(s, first.end + sep[0].length);
    if (second && second.value > first.value) {
      return { quantity: [first.value, second.value], length: second.end };
    }
  }
  return { quantity: first.value, length: first.end };
}

/** Parse a whole string as a number ("six", "4", "two and a half"). */
export function parseNumber(input: string): number | undefined {
  const trimmed = input.trim();
  const m = readQuantity(trimmed);
  if (!m) return undefined;
  if (trimmed.slice(m.length).trim() !== '') return undefined;
  return Array.isArray(m.quantity) ? m.quantity[0] : m.quantity;
}

/** Find the first number anywhere in a phrase ("serves about six people" → 6). */
export function findNumber(input: string): number | undefined {
  const s = input.toLowerCase();
  const starts = /(?<![a-z\d.])[a-z\d½¼¾⅓⅔⅛]/g;
  let m: RegExpExecArray | null;
  while ((m = starts.exec(s))) {
    const rest = s.slice(m.index);
    if (/^(?:a|an)\b/.test(rest)) continue;
    const q = readQuantity(rest);
    if (q) return Array.isArray(q.quantity) ? q.quantity[0] : q.quantity;
  }
  return undefined;
}

const NICE_FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

/** Round to a value that reads nicely in a kitchen (nearest ⅛/⅓ below 10, whole numbers above). */
export function roundNice(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 20) return Math.round(n);
  if (n >= 10) return Math.round(n * 2) / 2;
  const whole = Math.floor(n);
  const frac = n - whole;
  const choices = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
  if (n < 1) choices.splice(1, 0, 1 / 8);
  let best = choices[0]!;
  for (const c of choices) if (Math.abs(c - frac) < Math.abs(best - frac)) best = c;
  const result = whole + best;
  return result === 0 ? 1 / 8 : result;
}

function formatNumber(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  for (const [value, glyph] of NICE_FRACTIONS) {
    if (Math.abs(frac - value) < 0.02) {
      if (value === 0) return String(whole);
      return whole === 0 ? glyph : `${whole}${glyph}`;
    }
  }
  if (Math.abs(frac - 1) < 0.02) return String(whole + 1);
  return String(Math.round(n * 100) / 100);
}

/** 1.5 → "1½", [1, 2] → "1–2". */
export function formatQuantity(q: Quantity | undefined): string {
  if (q === undefined) return '';
  if (Array.isArray(q)) return `${formatNumber(q[0])}–${formatNumber(q[1])}`;
  return formatNumber(q);
}

export function quantityMax(q: Quantity): number {
  return Array.isArray(q) ? q[1] : q;
}

export function mapQuantity(q: Quantity, fn: (n: number) => number): Quantity {
  return Array.isArray(q) ? [fn(q[0]), fn(q[1])] : fn(q);
}
