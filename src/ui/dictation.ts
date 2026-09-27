import { createContext, useContext } from 'react';

/**
 * What a text field's Speak button needs from the speech layer. The speech layer provides it
 * with <DictationContext.Provider>; without a provider (or without speech support) fields show
 * no Speak button, so nothing offers a voice action that can't work.
 */
export interface Dictation {
  /** Start listening. Words arrive as partials, then as final text; `onEnd` fires when listening stops for any reason. */
  listen(handlers: { onPartial(text: string): void; onFinal(text: string): void; onEnd(): void }): { stop(): void };
}

export const DictationContext = createContext<Dictation | null>(null);

export const useDictation = () => useContext(DictationContext);
