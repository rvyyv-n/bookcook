/** Why listening stopped early. `denied`: the mic is blocked. `unsupported`: no recogniser here. `network`: the recogniser is online-only. */
export type SpeechError = 'denied' | 'unsupported' | 'network';

export interface ListenOptions {
  /** Keep listening through pauses (cook mode commands). Off for a single sentence (a field's Speak button). */
  continuous: boolean;
  lang: string;
  onPartial(text: string): void;
  onFinal(text: string): void;
  onError(error: SpeechError): void;
  /** Listening has stopped for good (stopped, finished the sentence, or failed). */
  onEnd?(): void;
}

export interface SpeakOptions {
  rate: number;
  /** A voice URI from `voices()`. The device default when missing or not found. */
  voice?: string;
  lang?: string;
}

/**
 * Listening and speaking behind one interface, so the Android build can swap in the native
 * recogniser and voice. Only one listener hears at a time: a newer one (a field's Speak button)
 * pauses an older continuous one (cook mode commands), which resumes when the newer one ends.
 */
export interface Speech {
  /** Speech recognition is available. Speaking is checked separately with `canSpeak`. */
  supported: boolean;
  canSpeak: boolean;
  listen(opts: ListenOptions): { stop(): void };
  /** Stops anything already being spoken, then speaks. Resolves when done or cancelled. */
  speak(text: string, opts: SpeakOptions): Promise<void>;
  cancel(): void;
  voices(): Voice[];
  /** Voices can load after the page does; call back when the list changes. Returns an unsubscribe. */
  onVoicesChanged(callback: () => void): () => void;
}

export interface Voice {
  uri: string;
  name: string;
  lang: string;
}
