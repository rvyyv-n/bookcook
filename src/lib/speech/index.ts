import { isNative } from '../platform/isNative';
import { createNativeListen } from './nativeListen';
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

/** Web Speech in the browser; Android's own recogniser and voice in the app. */
function create(): Speech {
  if (typeof window === 'undefined') return unavailable;
  return isNative() ? { ...createNativeListen(), ...createNativeTts() } : createWebSpeech();
}

/** The app's speech layer. */
export const speech: Speech = create();
