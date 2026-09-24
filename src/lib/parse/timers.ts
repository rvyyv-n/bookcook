import { readQuantity } from './numbers';

export interface DurationMatch {
  seconds: number;
  /** Index of the match in the original text. */
  index: number;
  length: number;
  text: string;
}

const UNIT_RE = /^\s*(?:-\s*)?(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b|^(h|m|s)\b/i;

function unitSeconds(word: string): number {
  const w = word.toLowerCase();
  if (w.startsWith('h')) return 3600;
  if (w.startsWith('m')) return 60;
  return 1;
}

function lowerBound(q: number | [number, number]): number {
  return Array.isArray(q) ? q[0] : q;
}

function readUnitAfter(text: string, pos: number): { seconds: number; end: number } | null {
  const rest = text.slice(pos);
  const m = UNIT_RE.exec(rest);
  if (!m) return null;
  // Single letters only when glued to the number ("10m", "1h").
  if (m[2] && pos > 0 && /\s/.test(text[pos - 1] ?? '')) return null;
  return { seconds: unitSeconds(m[1] ?? m[2]!), end: pos + m[0].length };
}

/** "and a half" after a unit: "an hour and a half". */
function readHalfAfter(text: string, pos: number): number | null {
  const m = /^\s+and\s+a\s+half\b/i.exec(text.slice(pos));
  return m ? m[0].length : null;
}

/** Find every duration in a step: "for 10 minutes", "about half an hour", "1 hr 15". */
export function findDurations(text: string): DurationMatch[] {
  const out: DurationMatch[] = [];
  const starts = /(?<![\p{L}\p{N}.])[\p{L}\p{N}½¼¾]/gu;
  let m: RegExpExecArray | null;
  while ((m = starts.exec(text))) {
    const start = m.index;
    const q = readQuantity(text.slice(start));
    if (!q) continue;
    let pos = start + q.length;
    const unit = readUnitAfter(text, pos);
    if (!unit) continue;
    let seconds = lowerBound(q.quantity) * unit.seconds;
    pos = unit.end;

    const half = readHalfAfter(text, pos);
    if (half) {
      seconds += unit.seconds / 2;
      pos += half;
    } else if (unit.seconds >= 60) {
      // "1 hour 15", "1 hr and 15 minutes", "2 minutes 30 seconds"
      const lead = /^\s*(?:,\s*)?(?:and\s+)?/i.exec(text.slice(pos))!;
      const tStart = pos + lead[0].length;
      const tq = lead[0].length > 0 ? readQuantity(text.slice(tStart)) : null;
      if (tq && !Array.isArray(tq.quantity)) {
        const after = tStart + tq.length;
        const sub = readUnitAfter(text, after);
        const smaller = unit.seconds / 60;
        const bareEnd = /^\s*(?:$|[,.;)]|(?:or|until|till)\b)/i.test(text.slice(after));
        if (sub && sub.seconds === smaller) {
          seconds += tq.quantity * smaller;
          pos = sub.end;
        } else if (!sub && unit.seconds === 3600 && /^\d/.test(text.slice(tStart)) && tq.quantity < 60 && bareEnd) {
          seconds += tq.quantity * 60;
          pos = after;
        }
      }
    }
    if (seconds > 0) {
      const raw = text.slice(start, pos);
      const lead = raw.length - raw.trimStart().length;
      out.push({
        seconds: Math.round(seconds),
        index: start + lead,
        length: raw.trim().length,
        text: raw.trim(),
      });
    }
    starts.lastIndex = pos;
  }
  return out;
}

/** The main timer for a step (the first duration), if any. */
export function stepTimer(text: string): number | undefined {
  return findDurations(text)[0]?.seconds;
}

/** 1500 → "25 min", 4500 → "1 hr 15 min", 90 → "1 min 30 sec". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h} hr`);
  if (m) parts.push(`${m} min`);
  if (s) parts.push(`${s} sec`);
  return parts.join(' ') || '0 min';
}

/** Spoken form: 600 → "10 minute", used in "Your 10 minute timer is done". */
export function spokenDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h} hour`);
  if (m) parts.push(`${m} minute`);
  if (s) parts.push(`${s} second`);
  return parts.join(' ');
}

/** 75 → "1:15", 3725 → "1:02:05" (for countdowns). */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** ISO-8601 duration ("PT1H15M") → minutes. */
export function isoDurationToMinutes(iso: string | undefined): number | undefined {
  if (!iso || typeof iso !== 'string') return undefined;
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(iso.trim());
  if (!m) return undefined;
  const [, d, h, min, s] = m;
  const total = Number(d ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(min ?? 0) + Number(s ?? 0) / 60;
  return total > 0 ? Math.round(total) : undefined;
}
