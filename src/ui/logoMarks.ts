/**
 * The Bookcook mark: a pixel-art pot on a rounded tile. `rice` (a cream pot of rice on tomato) is the
 * light-mode mark, `dark` (a tomato pot on ink) the dark-mode one, and `lid` (a lidded pot, plainer so
 * it reads at 16px) the browser-tab icon. The grids are 20×20; shorter rows are centred.
 */

const TOMATO = '#c4472c';
const INK = '#2a1d14';
const PAPER = '#faf5ee';

const STEAM = ['......W.....W.......', '.....W.....W........', '......W.....W.......', '.....W.....W........', ''];
const RICE = ['KKKKKKKKKKKKKK', 'KRRARRRGRRRARRRK'];
const BODY = [
  'KKKKKKKKKKKKKKKKKK',
  'KKPhPPPPPPPPPPPPpPKK',
  'K.KhPPPPPPPPPPPPpK.K',
  'KKKhPPPPPPPPPPPPpKKK',
  'KPPPPPPPPPPPPPpK',
  'KPPPPPPPPPPPPppK',
  'KPPPPPPPPPPppK',
  'KpPPPPPPPPpppK',
  'KppppppppppK',
  'KKKKKKKKKK',
];
const CREAM: Record<string, string> = { K: INK, P: '#f6e6cf', p: '#dcbc94', h: PAPER, R: PAPER, A: '#eaa936', G: '#5f9440', W: PAPER };

export const MARKS: Record<'rice' | 'dark' | 'lid', { tile: string; palette: Record<string, string>; rows: string[] }> = {
  rice: { tile: TOMATO, palette: CREAM, rows: ['', ...STEAM, ...RICE, ...BODY] },
  dark: {
    tile: INK,
    palette: { ...CREAM, K: '#120b07', P: TOMATO, p: '#9c3520', h: '#e7765a', W: '#f3e6d6' },
    rows: ['', ...STEAM, ...RICE, ...BODY],
  },
  lid: {
    tile: TOMATO,
    palette: CREAM,
    rows: [
      '',
      '....W...........W...',
      '...W....KK.....W....',
      '....W.KKKKKK....W...',
      'KKhPPPPPPpKK',
      'KhPPPPPPPPPPpK',
      'KKKKKKKKKKKKKKKK',
      ...BODY.slice(1),
    ],
  },
};

export type LogoVariant = keyof typeof MARKS;

export const SIZE = 20;
export const PAD = 3;
export const BOX = SIZE + 2 * PAD;

export function pixels(variant: LogoVariant) {
  const { palette, rows } = MARKS[variant];
  return rows.flatMap((row, y) => {
    const off = Math.floor((SIZE - row.length) / 2);
    return [...row].flatMap((c, x) => (palette[c] ? [{ x: x + off, y, fill: palette[c] }] : []));
  });
}

/** The mark as a standalone SVG file (used for the favicon). */
export function logoSvg(variant: LogoVariant): string {
  const rects = pixels(variant)
    .map((p) => `<rect x="${p.x}" y="${p.y}" width="1.03" height="1.03" fill="${p.fill}"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${BOX} ${BOX}" shape-rendering="crispEdges">` +
    `<rect x="${-PAD}" y="${-PAD}" width="${BOX}" height="${BOX}" rx="${BOX * 0.24}" fill="${MARKS[variant].tile}" shape-rendering="geometricPrecision"/>` +
    `${rects}</svg>`
  );
}
