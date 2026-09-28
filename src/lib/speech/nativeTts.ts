import { TextToSpeech } from '@capacitor-community/text-to-speech';
import type { Speech, Voice } from './Speech';

export type NativeVoice = Pick<Speech, 'canSpeak' | 'speak' | 'cancel' | 'voices' | 'onVoicesChanged'>;

type PluginVoice = Awaited<ReturnType<typeof TextToSpeech.getSupportedVoices>>['voices'][number];

/** Android's text-to-speech engine through the Capacitor plugin. The plugin picks a voice by its index in its own list. */
export function createNativeTts(plugin: Pick<typeof TextToSpeech, 'speak' | 'stop' | 'getSupportedVoices'> = TextToSpeech): NativeVoice {
  let list: PluginVoice[] = [];
  const listeners = new Set<() => void>();
  // The plugin's voice list is async but `voices()` isn't: load it once and tell listeners when it lands.
  plugin.getSupportedVoices().then(
    ({ voices }) => {
      list = voices;
      listeners.forEach((cb) => cb());
    },
    () => {
      // No engine or no voices: the device default still speaks.
    },
  );

  return {
    canSpeak: true,
    async speak(text, opts) {
      const index = opts.voice ? list.findIndex((v) => v.voiceURI === opts.voice) : -1;
      const voice = list[index];
      try {
        await plugin.speak({
          text,
          lang: voice?.lang ?? opts.lang ?? 'en-US',
          rate: opts.rate,
          ...(voice ? { voice: index } : {}),
          // Flush: a new sentence replaces whatever is still being spoken, as speechSynthesis does here.
          queueStrategy: 0,
        });
      } catch {
        // Stopped or interrupted by a newer utterance: the sentence is over either way.
      }
    },
    cancel() {
      void plugin.stop().catch(() => {});
    },
    voices: (): Voice[] => list.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang })),
    onVoicesChanged(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
