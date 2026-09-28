import { en } from '../../i18n/en';
import { findDurations } from './timers';

export type Command =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'repeat' }
  | { type: 'done' }
  | { type: 'undo' }
  | { type: 'ingredients' }
  | { type: 'startTimer' }
  | { type: 'setTimer'; seconds: number }
  | { type: 'stop' };

export type CommandType = Command['type'];

export interface CommandPhrases {
  next: readonly string[];
  back: readonly string[];
  repeat: readonly string[];
  done: readonly string[];
  undo: readonly string[];
  ingredients: readonly string[];
  startTimer: readonly string[];
  stop: readonly string[];
  /** Words that mean "timer" in "set a timer for 5 minutes". */
  timerWord: readonly string[];
  /** Politeness and filler stripped from both ends. */
  filler: readonly string[];
  /** Phrases that separate items while dictating ("two onions next a cup of rice"). */
  separators: readonly string[];
}

export function normalizeUtterance(text: string, phrases: CommandPhrases = en.voice.commands): string {
  let s = text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const filler = [...phrases.filler].sort((a, b) => b.length - a.length);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of filler) {
      if (s === f) continue;
      if (s.startsWith(`${f} `)) {
        s = s.slice(f.length + 1);
        changed = true;
      }
      if (s.endsWith(` ${f}`)) {
        s = s.slice(0, -f.length - 1);
        changed = true;
      }
    }
  }
  return s;
}

const SIMPLE: Exclude<CommandType, 'setTimer'>[] = ['next', 'back', 'repeat', 'done', 'undo', 'ingredients', 'startTimer', 'stop'];

/**
 * Recognise a whole utterance as a voice command.
 * Returns null when the utterance is ordinary speech.
 */
export function parseCommand(text: string, phrases: CommandPhrases = en.voice.commands): Command | null {
  const s = normalizeUtterance(text, phrases);
  if (!s) return null;

  const mentionsTimer = phrases.timerWord.some((w) => new RegExp(`\\b${w}\\b`).test(s));
  if (mentionsTimer) {
    const d = findDurations(s)[0];
    if (d) return { type: 'setTimer', seconds: d.seconds };
  }
  for (const type of SIMPLE) {
    if (phrases[type].includes(s)) return { type } as Command;
  }
  // "set a timer for five minutes" without the word timer: "five minute timer please" is covered above.
  const timerOnly = /^(?:set|start|put on)\s+(?:a\s+)?(.+)$/.exec(s);
  if (timerOnly && mentionsTimer === false) {
    const d = findDurations(timerOnly[1]!)[0];
    if (d && d.text.length >= timerOnly[1]!.trim().length - 1) return { type: 'setTimer', seconds: d.seconds };
  }
  return null;
}

/**
 * Split dictation on the spoken separator ("next"), so "two onions next a cup of rice"
 * becomes ["two onions", "a cup of rice"]. Every part except the last is a finished item;
 * "two onions next" gives ["two onions", ""]. "next to" is ordinary speech, and in "next one cup
 * of yogurt" the "one" is the amount, so "next one" only separates at a pause or the end.
 */
export function splitOnSeparator(text: string, phrases: CommandPhrases = en.voice.commands): string[] {
  const seps = [...phrases.separators]
    .sort((a, b) => b.length - a.length)
    .map((s) => (/\bone$/.test(s) ? `${escape(s)}(?=\\s*(?:$|[,.;]))` : escape(s)));
  const re = new RegExp(`(?:^|(?<=[\\s,.;]))(?:${seps.join('|')})(?!\\s+to\\b)(?=$|[\\s,.;])`, 'i');
  return text.split(re).map((p) => p.replace(/^[\s,.;]+|[\s,.;]+$/g, '').trim());
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
}
