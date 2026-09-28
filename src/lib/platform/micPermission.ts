import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { speech } from '../speech';
import { isNative } from './isNative';

export type MicState = 'granted' | 'prompt' | 'denied' | 'unsupported';

type Plugin = Pick<typeof SpeechRecognition, 'checkPermissions' | 'requestPermissions'>;

export interface MicEnv {
  supported: boolean;
  native: boolean;
  plugin: Plugin;
  nav: Pick<Navigator, 'permissions' | 'mediaDevices'>;
}

function env(): MicEnv {
  return { supported: speech.supported, native: isNative(), plugin: SpeechRecognition, nav: navigator };
}

function fromNative(state: string): MicState {
  return state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt';
}

/** Whether the microphone can be used now, without asking. */
export async function micState(e: MicEnv = env()): Promise<MicState> {
  if (!e.supported) return 'unsupported';
  try {
    if (e.native) return fromNative((await e.plugin.checkPermissions()).speechRecognition);
    // Firefox has no 'microphone' permission name and throws: treat it as not asked yet.
    const status = await e.nav.permissions.query({ name: 'microphone' as PermissionName });
    return status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'prompt';
  }
}

/** Ask for the microphone and report the result. */
export async function requestMic(e: MicEnv = env()): Promise<MicState> {
  if (!e.supported) return 'unsupported';
  try {
    if (e.native) return fromNative((await e.plugin.requestPermissions()).speechRecognition);
    const stream = await e.nav.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch {
    // Refusing the prompt, dismissing it, a blocked site and no microphone all end here.
    return 'denied';
  }
}
