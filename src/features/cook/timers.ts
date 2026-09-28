import type { Ingredient, Step } from '../../db/types';
import { spiceGroups } from '../../design/skin';
import { findMentions } from '../../lib/parse/mentions';
import { findDurations } from '../../lib/parse/timers';

/** A running cook-mode timer. Times are absolute so a reload (or a sleeping phone) doesn't lose any. */
export interface CookTimer {
  id: string;
  /** "Rice": the step's first ingredient. Missing for "set a timer for 5 minutes". */
  name?: string;
  /** What to do when it rings ("Then drain."), from the rest of the step's sentence. */
  detail?: string;
  stepIndex?: number;
  /** Where in the step's text its duration starts, linking the timer to that duration's chip. */
  source?: number;
  /** Length of the current run, for the ring. */
  total: number;
  endsAt: number;
  /** Set while paused. */
  pausedRemaining?: number;
  spiceGroup?: 1 | 2 | 3 | 4;
}

export type TimerState = 'running' | 'hot' | 'paused' | 'finished';

export const secondsLeft = (t: CookTimer, now: number) => t.pausedRemaining ?? Math.max(0, Math.ceil((t.endsAt - now) / 1000));

export function timerState(t: CookTimer, now: number): TimerState {
  if (t.pausedRemaining !== undefined) return 'paused';
  const left = secondsLeft(t, now);
  if (left <= 0) return 'finished';
  return left < 60 ? 'hot' : 'running';
}

/** How much of the run has gone, 0–1. */
export const elapsed = (t: CookTimer, now: number) => (t.total ? Math.min(1, Math.max(0, 1 - secondsLeft(t, now) / t.total)) : 1);

export const pauseTimer = (t: CookTimer, now: number): CookTimer => ({ ...t, pausedRemaining: secondsLeft(t, now) });

export function resumeTimer(t: CookTimer, now: number): CookTimer {
  const { pausedRemaining = 0, ...rest } = t;
  return { ...rest, endsAt: now + pausedRemaining * 1000 };
}

/** +1 min: a finished timer starts a fresh minute; a running one gets a minute longer. */
export function addMinute(t: CookTimer, now: number): CookTimer {
  if (timerState(t, now) === 'finished') return { ...t, total: 60, endsAt: now + 60_000, pausedRemaining: undefined };
  if (t.pausedRemaining !== undefined) return { ...t, total: t.total + 60, pausedRemaining: t.pausedRemaining + 60 };
  return { ...t, total: t.total + 60, endsAt: t.endsAt + 60_000 };
}

/** A duration in a step: its length and where it sits in the text. */
export interface StepDuration {
  seconds: number;
  index?: number;
  end?: number;
}

/** The timer a step asks for: its stored timer, or the first duration in its text. */
export function stepTimer(step: Step): StepDuration | undefined {
  const found = findDurations(step.text)[0];
  const at = found && { seconds: found.seconds, index: found.index, end: found.index + found.length };
  if (step.timerSeconds) return found?.seconds === step.timerSeconds ? at : { seconds: step.timerSeconds };
  return at;
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "…around 7 minutes, then drain." → "Then drain." Nothing when the sentence ends at the duration. */
export function afterDuration(text: string, end: number): string | undefined {
  const rest = text.slice(end).split(/(?<=[.!?])\s/)[0]!;
  const clause = rest
    .replace(/^[\s,;:–—-]+/, '')
    .replace(/^(?:and|or)\s+/i, '')
    .trim();
  if (!/\p{L}{3}/u.test(clause)) return undefined;
  return capitalise(/[.!?]$/.test(clause) ? clause : `${clause}.`);
}

/** A new timer for a step, named after the first ingredient it mentions ("Rice"). */
export function timerForStep(
  step: Step,
  stepIndex: number,
  ingredients: Ingredient[],
  now: number,
  id: string,
  /** A particular duration in the step (its chip was tapped); otherwise the step's main timer. */
  which?: StepDuration,
): CookTimer | undefined {
  const found = which ?? stepTimer(step);
  if (!found) return undefined;
  const mention = findMentions(step.text, ingredients)[0];
  const ingredient = mention && ingredients.find((i) => i.id === mention.ingredientId);
  const groups = spiceGroups(ingredients.map((i) => i.section));
  return {
    id,
    name: mention ? capitalise(step.text.slice(mention.index, mention.index + mention.length).toLowerCase()) : undefined,
    detail: found.end !== undefined ? afterDuration(step.text, found.end) : undefined,
    stepIndex,
    source: found.index,
    total: found.seconds,
    endsAt: now + found.seconds * 1000,
    spiceGroup: ingredient?.section ? groups.get(ingredient.section) : undefined,
  };
}

// Running timers are kept in localStorage per recipe, so a reload mid-cook doesn't lose them.

const key = (recipeId: string) => `bookcook.timers.${recipeId}`;

export function loadTimers(recipeId: string, storage: Storage = localStorage): CookTimer[] {
  try {
    const list = JSON.parse(storage.getItem(key(recipeId)) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((t): t is CookTimer => typeof t?.id === 'string' && typeof t?.endsAt === 'number') : [];
  } catch {
    return [];
  }
}

export function saveTimers(recipeId: string, timers: CookTimer[], storage: Storage = localStorage): void {
  try {
    if (timers.length) storage.setItem(key(recipeId), JSON.stringify(timers));
    else storage.removeItem(key(recipeId));
  } catch {
    // Private mode or full storage: timers still work, they just won't survive a reload.
  }
}
