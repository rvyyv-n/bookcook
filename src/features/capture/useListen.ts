import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n';
import { speech, type SpeechError } from '../../lib/speech';

/** idle: tap to talk · listening · processing: stopping, the last words are being written down. */
export type ListenStatus = 'idle' | 'listening' | 'processing' | 'denied' | 'unsupported';

/**
 * The big mic's listening: a tap starts it, a tap stops it. `continuous` keeps listening through
 * pauses (Hands-free, Just talk); otherwise it stops after one phrase. Finished phrases go to `onFinal`;
 * the words still being heard are `partial`.
 */
export function useListen({ onFinal, onError }: { onFinal: (text: string) => void; onError?: (e: SpeechError) => void }) {
  const t = useT();
  const [status, setStatus] = useState<ListenStatus>(speech.supported ? 'idle' : 'unsupported');
  const [partial, setPartial] = useState('');
  const session = useRef<{ stop(): void } | null>(null);
  const handlers = useRef({ onFinal, onError });
  useEffect(() => {
    handlers.current = { onFinal, onError };
  });
  useEffect(() => () => session.current?.stop(), []);

  const start = useCallback(
    (continuous: boolean) => {
      if (!speech.supported || session.current) return;
      setStatus('listening');
      let failed: SpeechError | undefined;
      const mine = speech.listen({
        continuous,
        lang: t.speechLang,
        onPartial: setPartial,
        onFinal: (text) => handlers.current.onFinal(text),
        onError: (e) => {
          failed = e;
          handlers.current.onError?.(e);
        },
        onEnd: () => {
          if (session.current === mine) session.current = null;
          setPartial('');
          setStatus(failed === 'denied' ? 'denied' : failed === 'unsupported' ? 'unsupported' : 'idle');
        },
      });
      session.current = mine;
    },
    [t.speechLang],
  );

  /** Stop listening; the last words still arrive as a final phrase before it goes idle. */
  const stop = useCallback(() => {
    const s = session.current;
    if (!s) return;
    setStatus('processing');
    s.stop();
  }, []);

  /** After "Try again" on the blocked mic. */
  const reset = useCallback(() => setStatus(speech.supported ? 'idle' : 'unsupported'), []);

  return { status, partial, start, stop, reset, listening: status === 'listening' };
}
