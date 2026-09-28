import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeListen } from './nativeListen';

type Handler = (e: never) => void;

/** A stand-in for the Capacitor recogniser plugin that the test drives by hand. */
function fakePlugin(permission: 'granted' | 'denied' | 'prompt' = 'granted') {
  const handlers: Record<string, Handler> = {};
  let id = 0;
  let live: number | undefined;
  const emit = (name: string, e: unknown) => handlers[name]?.(e as never);
  const plugin = {
    permission,
    starts: [] as { language?: string; muteRecognizerBeep?: boolean }[],
    checkPermissions: vi.fn(async () => ({ speechRecognition: plugin.permission })),
    requestPermissions: vi.fn(async () => {
      if (plugin.permission === 'prompt') plugin.permission = 'granted';
      return { speechRecognition: plugin.permission };
    }),
    start: vi.fn(async (opts: { language?: string; muteRecognizerBeep?: boolean }) => {
      plugin.starts.push(opts);
      live = ++id;
      emit('listeningState', { state: 'startingListening', sessionId: live });
      return {};
    }),
    stop: vi.fn(async () => {
      if (live !== undefined) queueMicrotask(() => plugin.end());
    }),
    addListener: vi.fn(async (name: string, fn: Handler) => {
      handlers[name] = fn;
      return { remove: async () => {} };
    }),
    get running() {
      return live !== undefined;
    },
    say(text: string) {
      emit('partialResults', { matches: [text] });
    },
    fail(code: string) {
      emit('error', { code, message: code, sessionId: live });
    },
    end() {
      const ended = live;
      live = undefined;
      emit('listeningState', { state: 'stopped', sessionId: ended });
    },
  };
  return plugin;
}

function setup(permission?: 'granted' | 'denied' | 'prompt') {
  const plugin = fakePlugin(permission);
  const speech = createNativeListen(plugin as never, document);
  return { plugin, speech };
}

const handlers = () => ({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn(), onEnd: vi.fn() });
const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('native listening', () => {
  it('passes on partials, then the last words as final when the utterance ends', async () => {
    const { plugin, speech } = setup();
    const h = handlers();
    speech.listen({ continuous: false, lang: 'en-GB', ...h });
    await tick();
    expect(plugin.starts[0]).toMatchObject({ language: 'en-GB', muteRecognizerBeep: false });
    plugin.say('two');
    plugin.say('two onions');
    expect(h.onPartial).toHaveBeenLastCalledWith('two onions');
    plugin.end();
    expect(h.onFinal).toHaveBeenCalledWith('two onions');
    expect(h.onEnd).toHaveBeenCalledOnce();
    expect(h.onError).not.toHaveBeenCalled();
  });

  it('stopping delivers what was heard', async () => {
    const { plugin, speech } = setup();
    const h = handlers();
    const session = speech.listen({ continuous: true, lang: 'en-US', ...h });
    await tick();
    plugin.say('a pinch of salt');
    session.stop();
    await tick();
    expect(h.onFinal).toHaveBeenCalledWith('a pinch of salt');
    expect(h.onEnd).toHaveBeenCalledOnce();
    expect(plugin.running).toBe(false);
  });

  it('asks for the mic, and reports it denied when refused', async () => {
    const { plugin, speech } = setup('denied');
    const h = handlers();
    speech.listen({ continuous: false, lang: 'en-US', ...h });
    await tick();
    expect(plugin.requestPermissions).toHaveBeenCalled();
    expect(plugin.start).not.toHaveBeenCalled();
    expect(h.onError).toHaveBeenCalledWith('denied');
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('starts once the mic is allowed', async () => {
    const { plugin, speech } = setup('prompt');
    speech.listen({ continuous: false, lang: 'en-US', ...handlers() });
    await tick();
    expect(plugin.start).toHaveBeenCalledOnce();
  });

  it('keeps a continuous listener going after each utterance, with the beep muted', async () => {
    const { plugin, speech } = setup();
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    await tick();
    plugin.say('next');
    await tick(1500);
    plugin.end();
    expect(h.onFinal).toHaveBeenCalledWith('next');
    await tick();
    expect(plugin.starts).toHaveLength(2);
    expect(plugin.starts[1]).toMatchObject({ muteRecognizerBeep: true });
    expect(h.onEnd).not.toHaveBeenCalled();
  });

  it('carries on through silence but stops on a network failure', async () => {
    const { plugin, speech } = setup();
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    await tick();
    plugin.fail('SPEECH_TIMEOUT');
    await tick(1500);
    plugin.end();
    await tick();
    expect(plugin.starts).toHaveLength(2);
    plugin.fail('NETWORK');
    plugin.end();
    expect(h.onError).toHaveBeenCalledWith('network');
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('gives up on a recogniser that keeps dying at once', async () => {
    const { plugin, speech } = setup();
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersToNextTimerAsync();
      if (plugin.running) plugin.end();
    }
    expect(h.onError).toHaveBeenCalledWith('network');
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('pauses cook commands while a field listens, then resumes them', async () => {
    const { plugin, speech } = setup();
    const cook = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...cook });
    await tick();
    plugin.say('half heard');
    const field = handlers();
    const dictation = speech.listen({ continuous: false, lang: 'en-US', ...field });
    await tick();
    expect(cook.onFinal).not.toHaveBeenCalled();
    expect(plugin.starts).toHaveLength(2);
    plugin.say('three cloves');
    dictation.stop();
    await tick();
    expect(field.onFinal).toHaveBeenCalledWith('three cloves');
    expect(field.onEnd).toHaveBeenCalledOnce();
    expect(cook.onFinal).not.toHaveBeenCalled();
    expect(cook.onEnd).not.toHaveBeenCalled();
    expect(plugin.starts).toHaveLength(3);
    expect(plugin.running).toBe(true);
  });

  it('ends a paused listener that is stopped without starting it again', async () => {
    const { plugin, speech } = setup();
    const cook = handlers();
    const commands = speech.listen({ continuous: true, lang: 'en-US', ...cook });
    await tick();
    const dictation = speech.listen({ continuous: false, lang: 'en-US', ...handlers() });
    await tick();
    commands.stop();
    expect(cook.onEnd).toHaveBeenCalledOnce();
    dictation.stop();
    await tick();
    expect(plugin.starts).toHaveLength(2);
    expect(plugin.running).toBe(false);
  });

  it('lets go of the mic while the app is hidden and listens again on return', async () => {
    const { plugin, speech } = setup();
    const cook = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...cook });
    await tick();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await tick(5000);
    expect(plugin.running).toBe(false);
    expect(plugin.starts).toHaveLength(1);
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await tick();
    expect(plugin.starts).toHaveLength(2);
    expect(cook.onEnd).not.toHaveBeenCalled();
    visibility.mockRestore();
  });

  it('reports a device without a recogniser as unsupported', async () => {
    const { plugin, speech } = setup();
    plugin.start.mockRejectedValueOnce(new Error('Speech recognition service is not available.'));
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    await tick();
    expect(h.onError).toHaveBeenCalledWith('unsupported');
    expect(h.onEnd).toHaveBeenCalledOnce();
  });
});
