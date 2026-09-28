import { describe, expect, it, vi } from 'vitest';
import { createNativeTts } from './nativeTts';

const voices = [
  { default: true, lang: 'en-US', localService: true, name: 'US', voiceURI: 'us' },
  { default: false, lang: 'en-GB', localService: true, name: 'UK', voiceURI: 'uk' },
];

function plugin() {
  return {
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    getSupportedVoices: vi.fn(() => Promise.resolve({ voices })),
  };
}

describe('createNativeTts', () => {
  it('lists the engine voices once they load and tells listeners', async () => {
    const p = plugin();
    const tts = createNativeTts(p);
    const changed = vi.fn();
    tts.onVoicesChanged(changed);
    expect(tts.voices()).toEqual([]);
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    expect(tts.voices()).toEqual([
      { uri: 'us', name: 'US', lang: 'en-US' },
      { uri: 'uk', name: 'UK', lang: 'en-GB' },
    ]);
  });

  it('speaks with the chosen voice by index, at the given rate', async () => {
    const p = plugin();
    const tts = createNativeTts(p);
    await vi.waitFor(() => expect(tts.voices()).toHaveLength(2));
    await tts.speak('Hello', { rate: 0.8, voice: 'uk' });
    expect(p.speak).toHaveBeenCalledWith({ text: 'Hello', lang: 'en-GB', rate: 0.8, voice: 1, queueStrategy: 0 });
  });

  it('falls back to the device default for an unknown voice', async () => {
    const p = plugin();
    const tts = createNativeTts(p);
    await tts.speak('Hello', { rate: 1, voice: 'gone', lang: 'en-CA' });
    expect(p.speak).toHaveBeenCalledWith({ text: 'Hello', lang: 'en-CA', rate: 1, queueStrategy: 0 });
  });

  it('resolves when the engine rejects, and cancel stops it', async () => {
    const p = plugin();
    p.speak.mockRejectedValueOnce(new Error('interrupted'));
    const tts = createNativeTts(p);
    await expect(tts.speak('Hi', { rate: 1 })).resolves.toBeUndefined();
    tts.cancel();
    expect(p.stop).toHaveBeenCalled();
  });
});
