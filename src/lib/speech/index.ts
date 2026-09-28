import type { Speech } from './Speech';
import { createWebSpeech } from './web';

export type { ListenOptions, SpeakOptions, Speech, SpeechError, Voice } from './Speech';

const unavailable: Speech = {
  supported: false,
  canSpeak: false,
  listen(opts) {
    queueMicrotask(() => {
      opts.onError('unsupported');
      opts.onEnd?.();
    });
    return { stop() {} };
  },
  speak: () => Promise.resolve(),
  cancel() {},
  voices: () => [],
  onVoicesChanged: () => () => {},
};

/** The app's speech layer: Web Speech in the browser. The Android build will choose its native one here. */
export const speech: Speech = typeof window === 'undefined' ? unavailable : createWebSpeech();
