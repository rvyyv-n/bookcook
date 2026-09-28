import { describe, expect, it, vi } from 'vitest';
import { createWebSpeech } from './web';

/** A stand-in for the browser's recogniser that the test drives by hand. */
class FakeRecognition {
  static live: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  running = false;
  start() {
    this.running = true;
    FakeRecognition.live.push(this);
  }
  stop() {
    this.end();
  }
  abort() {
    this.end();
  }
  end() {
    if (!this.running) return;
    this.running = false;
    FakeRecognition.live = FakeRecognition.live.filter((r) => r !== this);
    this.onend?.();
  }
  say(text: string, isFinal = true) {
    const result = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }
}

function setup() {
  FakeRecognition.live = [];
  const win = { SpeechRecognition: FakeRecognition } as unknown as Window & typeof globalThis;
  return createWebSpeech(win);
}

const handlers = () => ({ onPartial: vi.fn(), onFinal: vi.fn(), onError: vi.fn(), onEnd: vi.fn() });

describe('web speech', () => {
  it('passes on what it hears and ends when stopped', () => {
    const speech = setup();
    const h = handlers();
    const session = speech.listen({ continuous: false, lang: 'en-US', ...h });
    FakeRecognition.live[0]!.say('two onions');
    expect(h.onFinal).toHaveBeenCalledWith('two onions');
    session.stop();
    expect(h.onEnd).toHaveBeenCalledOnce();
  });

  it('pauses cook commands while a field listens, then resumes them', () => {
    const speech = setup();
    const cook = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...cook });
    const field = handlers();
    const dictation = speech.listen({ continuous: false, lang: 'en-US', ...field });
    expect(FakeRecognition.live).toHaveLength(1);
    FakeRecognition.live[0]!.say('less chilli');
    expect(field.onFinal).toHaveBeenCalledWith('less chilli');
    expect(cook.onFinal).not.toHaveBeenCalled();
    dictation.stop();
    expect(cook.onEnd).not.toHaveBeenCalled();
    expect(FakeRecognition.live).toHaveLength(1);
    FakeRecognition.live[0]!.say('next');
    expect(cook.onFinal).toHaveBeenCalledWith('next');
  });

  it('keeps continuous listening going through silences', () => {
    vi.useFakeTimers();
    const speech = setup();
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    vi.advanceTimersByTime(5000);
    FakeRecognition.live[0]!.end(); // the browser gives up after a silence
    vi.runAllTimers();
    expect(FakeRecognition.live).toHaveLength(1);
    expect(h.onEnd).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('reports a blocked mic and stops', () => {
    const speech = setup();
    const h = handlers();
    speech.listen({ continuous: true, lang: 'en-US', ...h });
    const rec = FakeRecognition.live[0]!;
    rec.onerror?.({ error: 'not-allowed' });
    rec.end();
    expect(h.onError).toHaveBeenCalledWith('denied');
    expect(h.onEnd).toHaveBeenCalledOnce();
    expect(FakeRecognition.live).toHaveLength(0);
  });

  it('says unsupported where there is no recogniser', async () => {
    const speech = createWebSpeech({} as Window & typeof globalThis);
    const h = handlers();
    speech.listen({ continuous: false, lang: 'en-US', ...h });
    await Promise.resolve();
    expect(speech.supported).toBe(false);
    expect(h.onError).toHaveBeenCalledWith('unsupported');
  });
});
