import { stripListMarker } from './ingredient';

/** Spoken cues that start a new step, longest first. */
const CUES = [
  "once that's done",
  'once that is done',
  "when that's done",
  'when that is done',
  'after that',
  'after this',
  'and after that',
  'and then',
  'afterwards',
  'afterward',
  'once done',
  'then',
  'next',
  'finally',
  'lastly',
];

const CUE_RE = new RegExp(
  `(?:^|[\\s,;]+)(?:${CUES.map((c) => c.replace(/ /g, '\\s+').replace(/'/g, "['’]?")).join('|')})(?![\\p{L}'])[\\s,]*`,
  'giu',
);

const LEADING = /^(?:(?:okay|ok|so|um+|uh+|and|well|alright|right|now|first(?:ly)?|to start|start by|you know|basically)\b[\s,]*)+/i;
const YOU = /^(?:you\s+(?:want\s+to|need\s+to|have\s+to|should|can|just|will|'ll)?\s*)/i;

/** Tidy one step: drop fillers, capitalise, end with a full stop. */
export function cleanStep(text: string): string {
  let s = stripListMarker(text).replace(/\s+/g, ' ').trim();
  s = s.replace(LEADING, '').replace(YOU, '').replace(LEADING, '').trim();
  s = s.replace(/[\s,;]+$/, '');
  if (!s) return '';
  s = s[0]!.toUpperCase() + s.slice(1);
  if (!/[.!?)]$/.test(s)) s += '.';
  return s;
}

/**
 * Split speech (or a paragraph) into steps on sentence ends and cue words
 * ("then", "after that", "once that's done").
 */
export function splitSteps(text: string): string[] {
  const sentences = text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+(?=\S)|\n+/)
    .flatMap((sentence) => sentence.split(CUE_RE));
  return sentences.map(cleanStep).filter((s) => s.replace(/[^\p{L}]/gu, '').length > 1);
}

/** Split written text into sentences only (pasted steps keep ", then" inside a sentence). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\d])|\n+/u)
    .map(cleanStep)
    .filter((s) => s.replace(/[^\p{L}]/gu, '').length > 1);
}
