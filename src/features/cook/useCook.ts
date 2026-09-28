import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n';
import { parseCommand, type Command } from '../../lib/parse/commands';
import { chime } from '../../lib/platform/chime';
import { speech } from '../../lib/speech';
import { addMinute, loadTimers, pauseTimer, resumeTimer, saveTimers, timerState, type CookTimer } from './timers';

/** The recipe's running timers, ticking twice a second and mirrored to localStorage. */
export function useCookTimers(recipeId: string) {
  const [timers, setTimers] = useState<CookTimer[]>(() => loadTimers(recipeId));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => saveTimers(recipeId, timers), [recipeId, timers]);
  useEffect(() => {
    if (!timers.length) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timers.length]);

  const change = useCallback((id: string, fn: (t: CookTimer, now: number) => CookTimer) => {
    const at = Date.now();
    setNow(at);
    setTimers((list) => list.map((t) => (t.id === id ? fn(t, at) : t)));
  }, []);

  return {
    timers,
    now,
    add: useCallback((t: CookTimer) => setTimers((list) => [...list, t]), []),
    remove: useCallback((ids: string[]) => setTimers((list) => list.filter((t) => !ids.includes(t.id))), []),
    toggle: useCallback(
      (id: string) => change(id, (t, at) => (t.pausedRemaining !== undefined ? resumeTimer(t, at) : pauseTimer(t, at))),
      [change],
    ),
    addMinute: useCallback((id: string) => change(id, addMinute), [change]),
    finished: timers.filter((t) => timerState(t, now) === 'finished'),
  };
}

/**
 * While a timer has finished: a soft chime every few seconds, and the spoken line when it first
 * rings and again every 20 seconds, until it's stopped.
 */
export function useAlarm(finished: CookTimer[], say: (id: string) => void) {
  const ids = finished.map((t) => t.id).join(' ');
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });
  useEffect(() => {
    if (!ids) return;
    const first = ids.split(' ')[0]!;
    let ticks = 0;
    chime();
    sayRef.current(first);
    const id = setInterval(() => {
      ticks++;
      chime();
      if (ticks % 5 === 0) sayRef.current(first);
    }, 4000);
    return () => clearInterval(id);
  }, [ids]);
}

export type VoiceState = 'listening' | 'off';

/**
 * Listens for cook commands (next, back, repeat, timer, stop…) for as long as cook mode is open.
 * Commands are matched on whole final phrases only, so the step being read aloud doesn't trigger them.
 */
export function useVoiceCommands(onCommand: (command: Command, heard: string) => void) {
  const { speechLang } = useT();
  const [state, setState] = useState<VoiceState>(speech.supported ? 'listening' : 'off');
  const handler = useRef(onCommand);
  useEffect(() => {
    handler.current = onCommand;
  });
  useEffect(() => {
    if (!speech.supported) return;
    let live = true;
    const session = speech.listen({
      continuous: true,
      lang: speechLang,
      onPartial() {},
      onFinal(text) {
        const command = parseCommand(text);
        if (command && live) handler.current(command, text);
      },
      onError() {},
      // Only a failure (the mic blocked, the recogniser gone) ends it while cook mode is open.
      onEnd: () => live && setState('off'),
    });
    return () => {
      live = false;
      session.stop();
    };
  }, [speechLang]);
  return state;
}
