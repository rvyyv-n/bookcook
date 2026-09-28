import { describe, expect, it } from 'vitest';
import type { Ingredient } from '../../db/types';
import {
  addMinute,
  afterDuration,
  elapsed,
  loadTimers,
  pauseTimer,
  resumeTimer,
  saveTimers,
  secondsLeft,
  timerForStep,
  timerState,
  type CookTimer,
} from './timers';

const ingredients: Ingredient[] = [
  { id: 'a', name: 'chicken', note: 'bone-in', section: 'For the marinade' },
  { id: 'b', name: 'basmati rice', section: 'For the rice' },
  { id: 'c', name: 'green cardamom', section: 'For the rice' },
];

const at = (endsIn: number, total = 600): CookTimer => ({ id: 't', total, endsAt: 1_000_000 + endsIn * 1000 });
const now = 1_000_000;

describe('cook timers', () => {
  it('goes hot under a minute and finishes at zero', () => {
    expect(timerState(at(600), now)).toBe('running');
    expect(timerState(at(59), now)).toBe('hot');
    expect(timerState(at(0), now)).toBe('finished');
    expect(timerState(at(-5), now)).toBe('finished');
    expect(secondsLeft(at(-5), now)).toBe(0);
  });

  it('measures how much has gone', () => {
    expect(elapsed(at(150, 600), now)).toBeCloseTo(0.75);
    expect(elapsed(at(-10, 600), now)).toBe(1);
  });

  it('pauses and resumes without losing time', () => {
    const paused = pauseTimer(at(90), now);
    expect(timerState(paused, now + 60_000)).toBe('paused');
    expect(secondsLeft(paused, now + 60_000)).toBe(90);
    const resumed = resumeTimer(paused, now + 60_000);
    expect(secondsLeft(resumed, now + 60_000)).toBe(90);
    expect(resumed.pausedRemaining).toBeUndefined();
  });

  it('adds a minute, restarting a finished timer', () => {
    expect(secondsLeft(addMinute(at(-3), now), now)).toBe(60);
    expect(addMinute(at(-3), now).total).toBe(60);
    expect(secondsLeft(addMinute(at(30), now), now)).toBe(90);
  });

  it('names a step timer after its first ingredient and keeps what to do next', () => {
    const t = timerForStep(
      { id: 's', text: "Boil the rice with the cardamom until it's about three-quarters done, around 7 minutes, then drain." },
      1,
      ingredients,
      now,
      'x',
    )!;
    expect(t.name).toBe('Rice');
    expect(t.total).toBe(420);
    expect(t.detail).toBe('Then drain.');
    expect(t.spiceGroup).toBe(2);
  });

  it('has no detail when the sentence ends at the duration, and no timer without one', () => {
    const t = timerForStep(
      { id: 's', text: 'Cook the chicken until the oil comes to the top, about 25 minutes.' },
      2,
      ingredients,
      now,
      'x',
    )!;
    expect(t.name).toBe('Chicken');
    expect(t.detail).toBeUndefined();
    expect(timerForStep({ id: 's', text: 'Serve hot.' }, 4, ingredients, now, 'x')).toBeUndefined();
  });

  it('reads the rest of a sentence', () => {
    expect(afterDuration('Rest for 10 minutes and slice.', 'Rest for 10 minutes'.length)).toBe('Slice.');
    expect(afterDuration('Rest for 10 minutes. Then serve.', 'Rest for 10 minutes'.length)).toBeUndefined();
  });

  it('survives a reload', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as Storage;
    saveTimers('r1', [at(60)], storage);
    expect(loadTimers('r1', storage)).toEqual([at(60)]);
    saveTimers('r1', [], storage);
    expect(loadTimers('r1', storage)).toEqual([]);
  });
});
