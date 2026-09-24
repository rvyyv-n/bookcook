import { singular } from './aisles';

export interface Mention {
  ingredientId: string;
  index: number;
  length: number;
}

/** Words too generic to identify an ingredient on their own. */
const GENERIC = new Set([
  'powder',
  'paste',
  'sauce',
  'leaves',
  'leaf',
  'seeds',
  'seed',
  'oil',
  'water',
  'juice',
  'stock',
  'flour',
  'sugar',
  'milk',
  'cream',
  'fresh',
  'dried',
  'ground',
  'large',
  'small',
  'medium',
  'big',
  'whole',
  'green',
  'red',
  'black',
  'white',
  'yellow',
  'brown',
  'hot',
  'sweet',
  'warm',
  'cold',
  'chopped',
  'sliced',
  'ripe',
  'extra',
  'virgin',
  'plain',
  'bone',
  'boneless',
  'skinless',
  'mixed',
  'fine',
]);

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match a word and its plural/singular ("onion" ↔ "onions", "tomato" ↔ "tomatoes"). */
function wordPattern(word: string): string {
  const base = singular(word.toLowerCase());
  return `${escape(base)}(?:es|s)?`;
}

function phrasePattern(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w, i, all) => (i === all.length - 1 ? wordPattern(w) : escape(w.toLowerCase())))
    .join('\\s+');
}

/** Search terms for an ingredient, most specific first. */
export function mentionTerms(name: string): string[] {
  const clean = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{L}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const terms = [clean];
  // Drop leading descriptors: "basmati rice" → "rice"; "red chilli powder" → "chilli powder".
  for (let i = 1; i < words.length; i++) {
    const tail = words.slice(i);
    if (tail.length === 1 && GENERIC.has(tail[0]!)) break;
    terms.push(tail.join(' '));
  }
  // Head noun when the last word is generic: "mint leaves" → "mint", "chilli powder" → "chilli".
  const meaningful = words.filter((w) => !GENERIC.has(w) && w.length > 2);
  if (meaningful.length) terms.push(meaningful[meaningful.length - 1]!);
  // First noun as a last resort: "chicken thighs" → "chicken".
  if (meaningful.length > 1) terms.push(meaningful[0]!);
  return [...new Set(terms)].filter((t) => t.length > 2);
}

/** Which of the recipe's ingredients a step mentions, with positions for highlighting. */
export function findMentions(text: string, ingredients: { id: string; name: string }[]): Mention[] {
  const candidates: { id: string; re: RegExp; specificity: number }[] = [];
  for (const ing of ingredients) {
    mentionTerms(ing.name).forEach((term, i) => {
      candidates.push({
        id: ing.id,
        re: new RegExp(`(?<![\\p{L}])${phrasePattern(term)}(?![\\p{L}])`, 'giu'),
        specificity: term.length * 10 - i,
      });
    });
  }
  const found: (Mention & { specificity: number })[] = [];
  for (const c of candidates) {
    c.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = c.re.exec(text))) {
      found.push({ ingredientId: c.id, index: m.index, length: m[0].length, specificity: c.specificity });
    }
  }
  // Longest, most specific matches win; no overlaps.
  found.sort((a, b) => b.length - a.length || b.specificity - a.specificity);
  const taken: Mention[] = [];
  for (const f of found) {
    if (taken.some((t) => f.index < t.index + t.length && t.index < f.index + f.length)) continue;
    taken.push({ ingredientId: f.ingredientId, index: f.index, length: f.length });
  }
  return taken.sort((a, b) => a.index - b.index);
}

/** Split text into plain and mentioned segments for rendering. */
export function segmentMentions(text: string, mentions: Mention[]): { text: string; ingredientId?: string }[] {
  const out: { text: string; ingredientId?: string }[] = [];
  let last = 0;
  for (const m of mentions) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: text.slice(m.index, m.index + m.length), ingredientId: m.ingredientId });
    last = m.index + m.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
