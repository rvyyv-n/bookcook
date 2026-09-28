// Layout differences between skins that tokens can't express.
// Everything else (colour, type, weights, radius, grain, mention style, button
// fill and border, cook button direction, timer ring size) lives in tokens.css.

export const SKINS = ['quiet', 'heirloom', 'spice-tin', 'colour-coded', 'colour-field'] as const;
export type Skin = (typeof SKINS)[number];

export interface SkinConfig {
  /** Cook mode step header: a bar ("Step 3 of 5" + segmented progress) or a big numeral with dots. */
  stepHeader: 'bar' | 'numeral';
  /** Pinned timer layout. tiles: outlined tiles · tray: inset sunk tray · pills: round tiles · rings: large progress rings. */
  timers: 'tiles' | 'tray' | 'pills' | 'rings';
  /** Recipe detail hero. bleed: full-bleed photo on top · fieldBand: accent field band, photo below it. */
  hero: 'bleed' | 'fieldBand';
  /** Recipe detail title block alignment. */
  detailAlign: 'start' | 'center';
  /** Secondary recipe actions. grid: 2-col outlined buttons · list: ruled rows with chevrons · iconRow: round icon + label. */
  actions: 'grid' | 'list' | 'iconRow';
  /** Cook mode surface. field sets data-surface="field" on the cook root. */
  cookSurface: 'paper' | 'field';
  /** Default for the spiceColours setting when this skin is chosen. The user can still change it. */
  spiceDefault: boolean;
  /** Colour field ignores the accent setting (always tomato). */
  accentLocked: boolean;
}

export const skinConfig: Record<Skin, SkinConfig> = {
  quiet:          { stepHeader: 'bar',     timers: 'tiles', hero: 'bleed',     detailAlign: 'start',  actions: 'grid',    cookSurface: 'paper', spiceDefault: false, accentLocked: false },
  heirloom:       { stepHeader: 'bar',     timers: 'tray',  hero: 'bleed',     detailAlign: 'center', actions: 'list',    cookSurface: 'paper', spiceDefault: false, accentLocked: false },
  'spice-tin':    { stepHeader: 'numeral', timers: 'pills', hero: 'bleed',     detailAlign: 'start',  actions: 'iconRow', cookSurface: 'paper', spiceDefault: false, accentLocked: false },
  'colour-coded': { stepHeader: 'bar',     timers: 'rings', hero: 'bleed',     detailAlign: 'start',  actions: 'iconRow', cookSurface: 'paper', spiceDefault: true,  accentLocked: false },
  'colour-field': { stepHeader: 'bar',     timers: 'pills', hero: 'fieldBand', detailAlign: 'center', actions: 'iconRow', cookSurface: 'field', spiceDefault: false, accentLocked: true },
};

export const SKIN_LABELS: Record<Skin, string> = {
  quiet: 'The Quiet Page',
  heirloom: 'Letterpress Heirloom',
  'spice-tin': 'Spice Tin',
  'colour-coded': 'Colour-coded',
  'colour-field': 'Colour field',
};

export type ThemeMode = 'light' | 'dark' | 'system';
export type Accent = 'tomato' | 'saffron';
export type TextSize = 'normal' | 'large' | 'huge';

export interface Appearance {
  skin: Skin;
  theme: ThemeMode;
  accent: Accent;
  textSize: TextSize;
  spiceColours: boolean;
  stepPhoto: boolean;
}

/** Writes the appearance settings onto <html>. Resolve 'system' with matchMedia('(prefers-color-scheme: dark)') and re-run on change. */
export function applyAppearance(a: Appearance, systemDark: boolean, root: HTMLElement = document.documentElement): void {
  root.dataset.skin = a.skin;
  root.dataset.theme = a.theme === 'system' ? (systemDark ? 'dark' : 'light') : a.theme;
  root.dataset.accent = skinConfig[a.skin].accentLocked ? 'tomato' : a.accent;
  root.dataset.textSize = a.textSize;
  root.dataset.spice = a.spiceColours ? 'on' : 'off';
}

/** Spice group for an ingredient section: order of first appearance, 1–4, wrapping. Off with fewer than 2 sections. */
export function spiceGroups(sections: (string | undefined)[]): Map<string, 1 | 2 | 3 | 4> {
  const order: string[] = [];
  for (const s of sections) if (s && !order.includes(s)) order.push(s);
  const out = new Map<string, 1 | 2 | 3 | 4>();
  if (order.length < 2) return out;
  order.forEach((s, i) => out.set(s, ((i % 4) + 1) as 1 | 2 | 3 | 4));
  return out;
}
