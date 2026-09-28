import { isNative } from '../platform/isNative';
import { createNativeTts } from './nativeTts';
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

/** Web Speech in the browser. In the Android app the voice is native; listening stays unavailable until the native recogniser lands. */
function create(): Speech {
  if (typeof window === 'undefined') return unavailable;
  return isNative() ? { ...unavailable, ...createNativeTts() } : createWebSpeech();
}

/** The app's speech layer. */
export const speech: Speech = create();
