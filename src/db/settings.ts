import { db } from './db';

export type TextSize = 'normal' | 'large' | 'huge';
export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  textSize: TextSize;
  theme: Theme;
  /** Read cook-mode steps aloud automatically. */
  readAloud: boolean;
  /** Speech rate for read-aloud (1 is normal; the default is a little slower). */
  speechRate: number;
  voiceURI: string | null;
  /** Speak guided "Tell it" questions aloud. */
  speakQuestions: boolean;
  defaultAuthor: string;
  /** The last author used, offered as the default next time. */
  lastAuthor: string;
  lang: 'en';
  handsFree: boolean;
  measureSystem: 'metric' | 'imperial' | 'auto';
  lastBackupAt: number | null;
  persistRequested: boolean;
  /** Name shown on requests you make ("Rayyan would love to learn…"). */
  myName: string;
  cookbookTitle: string;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  textSize: 'normal',
  theme: 'system',
  readAloud: true,
  speechRate: 0.9,
  voiceURI: null,
  speakQuestions: true,
  defaultAuthor: '',
  lastAuthor: '',
  lang: 'en',
  handsFree: false,
  measureSystem: 'auto',
  lastBackupAt: null,
  persistRequested: false,
  myName: '',
  cookbookTitle: '',
  onboarded: false,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as unknown as Settings;
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = await db.settings.get(key);
  return row ? (row.value as Settings[K]) : DEFAULT_SETTINGS[key];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })));
}
