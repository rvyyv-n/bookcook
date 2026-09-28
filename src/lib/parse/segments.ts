import { findMentions } from './mentions';
import { findDurations, type DurationMatch } from './timers';

export interface StepSegment {
  text: string;
  /** The ingredient this text names. */
  ingredientId?: string;
  /** A duration ("25 minutes"), which becomes a timer chip. */
  duration?: DurationMatch;
}

/** Split step text into plain text, ingredient mentions and durations. Durations win where they overlap. */
export function segmentStep(text: string, ingredients: { id: string; name: string }[]): StepSegment[] {
  const marks: { index: number; length: number; ingredientId?: string; duration?: DurationMatch }[] = findDurations(text).map((d) => ({
    index: d.index,
    length: d.length,
    duration: d,
  }));
  for (const m of findMentions(text, ingredients)) {
    if (marks.some((x) => m.index < x.index + x.length && x.index < m.index + m.length)) continue;
    marks.push({ index: m.index, length: m.length, ingredientId: m.ingredientId });
  }
  marks.sort((a, b) => a.index - b.index);
  const out: StepSegment[] = [];
  let last = 0;
  for (const m of marks) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const seg: StepSegment = { text: text.slice(m.index, m.index + m.length) };
    if (m.ingredientId) seg.ingredientId = m.ingredientId;
    if (m.duration) seg.duration = m.duration;
    out.push(seg);
    last = m.index + m.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
