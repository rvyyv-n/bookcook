import { SKINS, skinConfig, type Accent, type Skin, type TextSize, type ThemeMode } from '../design/skin';
import { db } from './db';

export type { Accent, Skin, TextSize };
export type Theme = ThemeMode;

export interface Settings {
  textSize: TextSize;
  theme: Theme;
  /** Visual style (see src/design/skin.ts). */
  skin: Skin;
  accent: Accent;
  /** Colour ingredient sections, mentions and timers. */
  spiceColours: boolean;
  /** Show step photos in cook mode. */
  stepPhoto: boolean;
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
  skin: 'quiet',
  accent: 'tomato',
  spiceColours: skinConfig.quiet.spiceDefault,
  stepPhoto: true,
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

/** The values a setting can take, where it's one of a few. */
const CHOICES: Partial<Record<keyof Settings, readonly unknown[]>> = {
  textSize: ['normal', 'large', 'huge'],
  theme: ['light', 'dark', 'system'],
  skin: SKINS,
  accent: ['tomato', 'saffron'],
  lang: ['en'],
  measureSystem: ['metric', 'imperial', 'auto'],
};
/** Settings whose default is null but that hold a value once set. */
const NULLABLE = { voiceURI: 'string', lastBackupAt: 'number' } as const;

/**
 * Whether a stored value fits the setting. A value from an older or newer app, or a hand-edited
 * backup (a skin that doesn't exist), falls back to the default instead of breaking the app.
 */
function isValid(key: keyof Settings, value: unknown): boolean {
  const choices = CHOICES[key];
  if (choices) return choices.includes(value);
  if (key in NULLABLE) return value === null || typeof value === NULLABLE[key as keyof typeof NULLABLE];
  return typeof value === typeof DEFAULT_SETTINGS[key];
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows) if (r.key in DEFAULT_SETTINGS && isValid(r.key as keyof Settings, r.value)) out[r.key] = r.value;
  return out as unknown as Settings;
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = await db.settings.get(key);
  return row && isValid(key, row.value) ? (row.value as Settings[K]) : DEFAULT_SETTINGS[key];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })));
}

/** Choose a skin. Ingredient colours reset to that skin's default; the user can change them after. */
export async function setSkin(skin: Skin): Promise<void> {
  await setSettings({ skin, spiceColours: skinConfig[skin].spiceDefault });
}
