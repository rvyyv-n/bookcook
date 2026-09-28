import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import type { ListenOptions, Speech, SpeechError } from './Speech';

export type NativeListen = Pick<Speech, 'supported' | 'listen'>;

type Plugin = Pick<typeof SpeechRecognition, 'start' | 'stop' | 'checkPermissions' | 'requestPermissions' | 'addListener'>;

interface Session {
  opts: ListenOptions;
  stopped: boolean;
  failure?: SpeechError;
  /** Runs that ended within a second: a recogniser that keeps dying is given up on. */
  quickEnds: number;
  /** Restarted after a pause, so the start beep is muted. */
  resumed: boolean;
}

/** One native recognition: Android hears a single utterance, then stops. */
interface Run {
  session: Session;
  /** The plugin's id for it, known once it has started. */
  id?: number;
  text: string;
  /** Cut short for a newer listener or a hidden app: what it heard is dropped. */
  aborted: boolean;
  startedAt: number;
}

function errorOf(code: string): SpeechError | undefined {
  if (code === 'INSUFFICIENT_PERMISSIONS' || code === 'AUDIO') return 'denied';
  if (code === 'NETWORK' || code === 'NETWORK_TIMEOUT' || code === 'SERVER' || code === 'SERVER_DISCONNECTED') return 'network';
  // SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED and ERROR_LANGUAGE_UNAVAILABLE, which the plugin doesn't name.
  if (code === 'UNKNOWN_12' || code === 'UNKNOWN_13') return 'unsupported';
  return undefined; // NO_MATCH, SPEECH_TIMEOUT, CLIENT, RECOGNIZER_BUSY: ordinary, keep going
}

function startErrorOf(e: unknown): SpeechError | undefined {
  const message = e instanceof Error ? e.message : String(e);
  if (/permission/i.test(message)) return 'denied';
  if (/not available/i.test(message)) return 'unsupported';
  return undefined;
}

/**
 * Android's recogniser through the Capacitor plugin, with the same rules as the web one: the newest
 * listener hears, pausing older ones, and a continuous listener starts again after each utterance.
 */
export function createNativeListen(plugin: Plugin = SpeechRecognition, doc: Document = document): NativeListen {
  // Listeners, newest last. Only the newest has a run, and one run exists at a time.
  const stack: Session[] = [];
  let run: Run | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let granted = false;

  const stopNative = () => void plugin.stop().catch(() => {});

  function finish(s: Session) {
    const i = stack.indexOf(s);
    if (i < 0) return;
    stack.splice(i, 1);
    if (s.failure) s.opts.onError(s.failure);
    s.opts.onEnd?.();
    pump();
  }

  /** Start the newest listener once nothing is running, after `delay`. */
  function pump(delay = 0) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      const top = stack.at(-1);
      if (!run && top && !top.stopped && doc.visibilityState === 'visible') begin(top);
    }, delay);
  }

  async function allowed() {
    if (granted) return true;
    let { speechRecognition: state } = await plugin.checkPermissions();
    if (state !== 'granted') ({ speechRecognition: state } = await plugin.requestPermissions());
    granted = state === 'granted';
    return granted;
  }

  function begin(s: Session) {
    const r: Run = { session: s, text: '', aborted: false, startedAt: Date.now() };
    run = r;
    void (async () => {
      try {
        if (!(await allowed())) {
          s.failure = 'denied';
          return end(r);
        }
        if (r.aborted || s.stopped) return end(r);
        await plugin.start({
          language: s.opts.lang,
          maxResults: 1,
          partialResults: true,
          muteRecognizerBeep: s.resumed,
        });
      } catch (e) {
        // Refused before it started; once started, the plugin reports failures as events.
        if (r.id !== undefined) return;
        s.failure ??= startErrorOf(e);
        end(r);
      }
    })();
  }

  function end(r: Run) {
    if (run !== r) return;
    run = undefined;
    const s = r.session;
    if (!r.aborted && r.text) s.opts.onFinal(r.text);
    s.opts.onPartial('');
    if (s.failure || s.stopped) return finish(s);
    // Paused for a newer listener or a hidden app: it carries on when that's over.
    if (r.aborted) return pump();
    if (!s.opts.continuous) return finish(s);
    s.quickEnds = Date.now() - r.startedAt < 1000 ? s.quickEnds + 1 : 0;
    if (s.quickEnds > 4) {
      s.failure = 'network';
      return finish(s);
    }
    s.resumed = true;
    pump(s.quickEnds * 400);
  }

  function abort(r: Run) {
    r.aborted = true;
    // Not started yet: begin() or the start event sees `aborted` and ends it.
    if (r.id !== undefined) stopNative();
  }

  void plugin.addListener('listeningState', (e) => {
    const r = run;
    if (!r) return;
    if (e.state === 'startingListening' && r.id === undefined) {
      r.id = e.sessionId;
      if (r.aborted || r.session.stopped) stopNative();
    } else if (e.state === 'stopped' && e.sessionId === r.id) end(r);
  });
  void plugin.addListener('partialResults', (e) => {
    const r = run;
    const text = e.matches?.[0]?.trim();
    if (!r || r.aborted || r.id === undefined || text === undefined) return;
    // The final result arrives this way too, just before the run stops.
    r.text = text;
    r.session.opts.onPartial(text);
  });
  void plugin.addListener('error', (e) => {
    const r = run;
    if (r && !r.aborted && e.sessionId === r.id) r.session.failure ??= errorOf(e.code);
  });
  // Android takes the mic from an app in the background, so listening waits until it's back.
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState !== 'visible') {
      if (run) abort(run);
    } else pump();
  });

  function listen(opts: ListenOptions) {
    const s: Session = { opts, stopped: false, quickEnds: 0, resumed: false };
    if (run) abort(run);
    stack.push(s);
    pump();
    return {
      stop() {
        if (s.stopped) return;
        s.stopped = true;
        // Let the recogniser deliver what it heard; its stop event finishes the session.
        if (run?.session === s) {
          if (run.id !== undefined) stopNative();
        } else finish(s);
      },
    };
  }

  return { supported: true, listen };
}
