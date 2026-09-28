import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../db/hooks';
import { useT } from '../i18n';
import { speech } from '../lib/speech';
import { DictationContext, type Dictation } from '../ui/dictation';

/** Turns on every text field's Speak button where the browser can listen. */
export function SpeechProvider({ children }: { children: ReactNode }) {
  const { speechLang } = useT();
  const value = useMemo<Dictation | null>(
    () =>
      speech.supported
        ? {
            listen: ({ onPartial, onFinal, onEnd }) =>
              speech.listen({ continuous: false, lang: speechLang, onPartial, onFinal, onError() {}, onEnd }),
          }
        : null,
    [speechLang],
  );
  return <DictationContext.Provider value={value}>{children}</DictationContext.Provider>;
}

/** Speak with the chosen voice and speed. `speaking` is true until it finishes or is cancelled. */
export function useSpeaker() {
  const { speechRate, voiceURI } = useSettings();
  const t = useT();
  const [speaking, setSpeaking] = useState(false);
  const turn = useRef(0);
  useEffect(() => () => speech.cancel(), []);

  const speak = useCallback(
    async (text: string) => {
      const mine = ++turn.current;
      setSpeaking(true);
      await speech.speak(text, { rate: speechRate, voice: voiceURI ?? undefined, lang: t.speechLang });
      // A later call has taken over; it owns the state now.
      if (turn.current === mine) setSpeaking(false);
    },
    [speechRate, voiceURI, t.speechLang],
  );
  const cancel = useCallback(() => {
    turn.current++;
    speech.cancel();
    setSpeaking(false);
  }, []);
  return { canSpeak: speech.canSpeak, speaking, speak, cancel };
}
