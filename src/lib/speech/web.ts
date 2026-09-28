import type { ListenOptions, SpeakOptions, Speech, SpeechError, Voice } from './Speech';

// The Web Speech recogniser isn't in TypeScript's DOM types; this is the part we use.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

interface Session {
  opts: ListenOptions;
  rec?: Recognition;
  stopped: boolean;
  failure?: SpeechError;
  startedAt: number;
  /** Restarts that ended within a second: a recogniser that keeps dying is given up on. */
  quickEnds: number;
}

function errorOf(code: string): SpeechError | undefined {
  if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') return 'denied';
  if (code === 'network') return 'network';
  if (code === 'language-not-supported') return 'unsupported';
  return undefined; // no-speech, aborted: ordinary, keep going
}

export function createWebSpeech(win: Window & typeof globalThis = window): Speech {
  const w = win as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  const synth = 'speechSynthesis' in win ? win.speechSynthesis : undefined;

  // Listeners, newest last. Only the newest has a running recogniser.
  const stack: Session[] = [];
  // Chrome stops firing events for utterances that get garbage-collected mid-sentence.
  const speaking = new Set<SpeechSynthesisUtterance>();

  function finish(s: Session) {
    const i = stack.indexOf(s);
    if (i < 0) return;
    const wasTop = i === stack.length - 1;
    stack.splice(i, 1);
    if (s.failure) s.opts.onError(s.failure);
    s.opts.onEnd?.();
    const next = stack.at(-1);
    if (wasTop && next && !next.rec && !next.stopped) start(next);
  }

  function start(s: Session) {
    const rec = new Ctor!();
    rec.lang = s.opts.lang;
    rec.continuous = s.opts.continuous;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        const text = r[0]?.transcript.trim() ?? '';
        if (r.isFinal) {
          if (text) s.opts.onFinal(text);
        } else partial += `${r[0]?.transcript ?? ''}`;
      }
      s.opts.onPartial(partial.trim());
    };
    rec.onerror = (e) => {
      s.failure ??= errorOf(e.error);
    };
    rec.onend = () => {
      if (s.rec !== rec) {
        // Paused for a newer listener; if it was also stopped meanwhile, it's over.
        if (s.stopped && !s.rec) finish(s);
        return;
      }
      s.rec = undefined;
      s.opts.onPartial('');
      if (s.failure || s.stopped || !s.opts.continuous) return finish(s);
      if (stack.at(-1) !== s) return;
      // Chrome ends continuous recognition after a silence; carry on unless it keeps dying at once.
      s.quickEnds = Date.now() - s.startedAt < 1000 ? s.quickEnds + 1 : 0;
      if (s.quickEnds > 4) {
        s.failure = 'network';
        return finish(s);
      }
      setTimeout(() => {
        if (!s.stopped && !s.rec && stack.at(-1) === s) start(s);
      }, s.quickEnds * 400);
    };
    s.rec = rec;
    s.startedAt = Date.now();
    try {
      rec.start();
    } catch {
      s.rec = undefined;
      s.failure = 'unsupported';
      finish(s);
    }
  }

  function listen(opts: ListenOptions) {
    if (!Ctor) {
      queueMicrotask(() => {
        opts.onError('unsupported');
        opts.onEnd?.();
      });
      return { stop() {} };
    }
    const s: Session = { opts, stopped: false, startedAt: 0, quickEnds: 0 };
    const prev = stack.at(-1);
    if (prev?.rec) {
      const r = prev.rec;
      prev.rec = undefined;
      r.abort();
    }
    stack.push(s);
    start(s);
    return {
      stop() {
        if (s.stopped) return;
        s.stopped = true;
        // Let the recogniser deliver what it heard; its end event finishes the session.
        if (s.rec) s.rec.stop();
        else finish(s);
      },
    };
  }

  function speak(text: string, opts: SpeakOptions): Promise<void> {
    if (!synth) return Promise.resolve();
    if (synth.speaking || synth.pending) synth.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate;
      u.lang = opts.lang ?? 'en-US';
      const voice = opts.voice ? synth.getVoices().find((v) => v.voiceURI === opts.voice) : undefined;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      const done = () => {
        speaking.delete(u);
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      speaking.add(u);
      synth.speak(u);
    });
  }

  return {
    supported: !!Ctor,
    canSpeak: !!synth,
    listen,
    speak,
    cancel: () => synth?.cancel(),
    voices: (): Voice[] => (synth?.getVoices() ?? []).map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang })),
    onVoicesChanged(callback) {
      synth?.addEventListener('voiceschanged', callback);
      return () => synth?.removeEventListener('voiceschanged', callback);
    },
  };
}
