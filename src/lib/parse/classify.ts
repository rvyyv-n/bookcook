import { isKnownIngredient } from './aisles';
import { parseIngredient, stripListMarker } from './ingredient';
import { readQuantity } from './numbers';
import { cleanStep, splitSteps } from './steps';
import { findDurations, stepTimer } from './timers';
import { readUnit } from './units';
import type { ParsedIngredient, ParsedStep } from './types';

export type LineKind = 'ingredient' | 'step';

/** Verbs that start a cooking instruction. */
export const STEP_VERBS = new Set(
  (
    'add fry boil mix stir cook bake heat put place pour chop cut slice dice mince grate whisk beat fold knead roll simmer saute sauté ' +
    'roast grill toast blend combine season serve garnish sprinkle drain rinse wash soak marinate cover remove transfer let leave bring ' +
    'reduce lower turn keep wait preheat melt spread layer top arrange set allow strain squeeze peel mash puree purée grind crush toss ' +
    'coat dip brush check taste adjust switch start finish make prepare use pat fill divide shape form wrap steam microwave chill cool ' +
    'refrigerate freeze rest sift cream scrape line grease drizzle flip press discard pound stuff repeat return increase when once after ' +
    'before until while meanwhile cut fold whip bash deglaze sear brown caramelise caramelize temper splutter crackle open close shake ' +
    'squash break crack separate pick tear warm defrost thaw clean trim score pierce skewer thread insert lift pull flatten beat cream'
  ).split(' '),
);

const FILLER = /^(?:(?:okay|ok|so|um+|uh+|and|then|now|first|you|just|also|well)\b[\s,]*)+/i;

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

/** Does the line read like an instruction rather than an ingredient? */
export function classifyLine(line: string): LineKind {
  const s = stripListMarker(line).replace(FILLER, '').trim();
  const w = words(s);
  if (w.length === 0) return 'step';
  const first = w[0]!.toLowerCase().replace(/[^a-zé]/g, '');
  if (STEP_VERBS.has(first)) return 'step';
  if (findDurations(s).length > 0) return 'step';
  if (w.length > 10) return 'step';
  if (/[.!?]\s+\S/.test(s)) return 'step';
  if (/\b(?:is|are|was|were|should|will|be|it|until|till|when|if|into|onto)\b/i.test(s)) return 'step';

  const q = readQuantity(s);
  const hasNumber = q !== null && !/^(?:a|an)\b/i.test(s);
  const unit = readUnit(q ? s.slice(q.length) : s);
  if (hasNumber || unit) return 'ingredient';
  if (/\b(?:to taste|as needed|as required)\b/i.test(s)) return 'ingredient';
  if (w.length <= 5 && isKnownIngredient(s)) return 'ingredient';
  if (q && w.length <= 5) return 'ingredient';
  return w.length <= 3 ? 'ingredient' : 'step';
}

const STOP = new Set(
  "and then in into with until till for to on the a an it of or but so maybe about around roughly like is are was that this you we it’s its it's until when".split(
    ' ',
  ),
);

/** Ingredients mentioned with an amount inside a spoken step ("add two cups of rice"). */
export function extractInlineIngredients(text: string): ParsedIngredient[] {
  const out: ParsedIngredient[] = [];
  const lower = text.toLowerCase();
  const starts = /(?<![\p{L}\p{N}.])[\p{L}\p{N}½¼¾]/gu;
  let m: RegExpExecArray | null;
  const durations = findDurations(text);
  while ((m = starts.exec(lower))) {
    const at = m.index;
    if (durations.some((d) => at >= d.index && at < d.index + d.length)) continue;
    const q = readQuantity(lower.slice(at));
    if (!q) continue;
    let pos = at + q.length;
    const u = readUnit(lower.slice(pos));
    if (u && !u.unit.trailing) pos += u.length;
    const tail = lower.slice(pos).replace(/^\s*of\b/, '');
    const nounWords: string[] = [];
    for (const w of words(tail.replace(/[,.;!?].*$/, ''))) {
      if (STOP.has(w) || nounWords.length >= 3) break;
      nounWords.push(w);
    }
    const noun = nounWords.join(' ');
    if (!noun) continue;
    const isA = /^(?:a|an)$/.test(lower.slice(at, at + q.length).trim());
    if (!u && (isA || !isKnownIngredient(noun))) continue;
    const parsed = parseIngredient(`${text.slice(at, pos)} ${noun}`);
    if (parsed.name) out.push(parsed);
    starts.lastIndex = pos;
  }
  // "the chicken, about a kilo" / "the yogurt maybe a cup"
  const after =
    /\b(?:the|some)\s+([a-z]+(?:\s+[a-z]+)?)[\s,]+(?:about|maybe|around|roughly|like|approximately)\s+([^,.;]+?)(?=$|[,.;]|\s+and\b)/gi;
  while ((m = after.exec(text))) {
    const amount = m[2]!;
    const q = readQuantity(amount);
    if (!q) continue;
    const u = readUnit(amount.slice(q.length));
    if (!u) continue;
    const name = m[1]!.replace(/\s+(?:about|maybe|around)$/i, '');
    if (out.some((o) => o.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ quantity: q.quantity, unit: u.unit.id, name });
  }
  return out;
}

export interface MonologueResult {
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
}

const NEED_LIST =
  /^(?:(?:so|okay|ok|and|first)\s+)*(?:you(?:'ll| will)?\s+need|we\s+need|you\s+need|ingredients\s+(?:are|is)|i\s+use|for\s+this\s+you\s+need)\s*:?\s*/i;

/** Just-talk: a free-flowing monologue → ingredients and steps. */
export function parseMonologue(transcript: string): MonologueResult {
  const ingredients: ParsedIngredient[] = [];
  const steps: ParsedStep[] = [];
  const seen = new Set<string>();
  const addIngredient = (ing: ParsedIngredient) => {
    const key = ing.name.toLowerCase();
    if (!ing.name || seen.has(key)) return;
    seen.add(key);
    ingredients.push(ing);
  };

  const sentences = transcript
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const need = NEED_LIST.exec(sentence);
    if (need) {
      const list = sentence.slice(need[0].length);
      for (const part of list.split(/\s*,\s*|\s+and\s+/)) {
        if (part.trim()) addIngredient(parseIngredient(part));
      }
      continue;
    }
    for (const segment of splitSteps(sentence)) {
      if (classifyLine(segment) === 'ingredient') {
        addIngredient(parseIngredient(segment));
      } else {
        const text = cleanStep(segment);
        const timerSeconds = stepTimer(text);
        steps.push(timerSeconds ? { text, timerSeconds } : { text });
        extractInlineIngredients(segment).forEach(addIngredient);
      }
    }
  }
  return { ingredients, steps };
}
