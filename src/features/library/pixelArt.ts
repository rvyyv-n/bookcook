/**
 * Pixel-art pictures for the example recipes, so the cookbook has something to look at before
 * anyone adds a photo. Each is a 16×16 grid drawn as an SVG whose background runs past the edges,
 * so it fills any box with the drawing centred.
 */

type Art = { background: string; palette: Record<string, string>; rows: string[] };

const OUTLINE = '#3b2414';

const BANANA: Art = {
  background: '#e9c6a4',
  palette: { K: OUTLINE, Y: '#f7cf48', y: '#d9a21c', H: '#fff0a8', B: '#6b4423' },
  rows: [
    '................',
    '.............BB.',
    '............KBK.',
    '...........KYyK.',
    '...........KYyK.',
    '..........KHYyK.',
    '..........KHYyK.',
    '.........KHYYyK.',
    '........KHYYyK..',
    '.......KHYYYyK..',
    '.....KKHYYYyyK..',
    '...KKHHYYYyyK...',
    '.KKHYYYYYyyK....',
    'BYYYYYYyyyK.....',
    '.KKyyyyyKK......',
    '...KKKKK........',
  ],
};

const LENTIL_SOUP: Art = {
  background: '#d7dfbf',
  palette: { K: OUTLINE, W: '#fffaf0', O: '#e38a2e', o: '#c46a1a', G: '#4f8a3a', B: '#3f6fa0', b: '#2c5078' },
  rows: [
    '................',
    '....W....W......',
    '.....W....W.....',
    '....W....W......',
    '.....W....W.....',
    '................',
    '.KKKKKKKKKKKKKK.',
    'KoOOGOOOOOOGOOoK',
    'KOOOOOOGOOOOOOOK',
    'KBBBBBBBBBBBBBBK',
    '.KBBBBBBBBBBBBK.',
    '.KbBBBBBBBBBBbK.',
    '..KbBBBBBBBBbK..',
    '...KbbbbbbbbK...',
    '....KKKKKKKK....',
    '................',
  ],
};

const BIRYANI: Art = {
  background: '#f0d2a8',
  palette: {
    K: OUTLINE,
    W: '#fffaf0',
    R: '#fbf1d6',
    A: '#f2a41c',
    C: '#9a4f24',
    M: '#4f8a3a',
    P: '#b8612e',
    p: '#8a4320',
  },
  rows: [
    '................',
    '.....W....W.....',
    '....W....W......',
    '.....W....W.....',
    '..KKKKKKKKKKKK..',
    '.KRRARRMRRARCRK.',
    '.KRCRRARRCRRMRK.',
    'KKPPPPPPPPPPPPKK',
    'KPPPPPPPPPPPPPPK',
    '.KpPPPPPPPPPPpK.',
    '.KpPPPPPPPPPPpK.',
    '..KpPPPPPPPPpK..',
    '..KppPPPPPPppK..',
    '...KppppppppK...',
    '....KKKKKKKK....',
    '................',
  ],
};

/** Title keyword → picture. */
export const ART: [RegExp, Art][] = [
  [/banana/i, BANANA],
  [/lentil|soup/i, LENTIL_SOUP],
  [/biryani/i, BIRYANI],
];

export function pixelArtSvg(art: Art): string {
  const rects: string[] = [];
  art.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const fill = art.palette[c];
      if (fill) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`);
    }),
  );
  // The viewBox leaves a margin around the 16×16 drawing; the background rect covers far beyond it.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -3 24 22" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">` +
    `<rect x="-500" y="-500" width="1016" height="1016" fill="${art.background}"/>${rects.join('')}</svg>`
  );
}

/** The pixel picture for an example recipe, if there's one for its title. */
export function examplePicture(title: string): Blob | undefined {
  const art = ART.find(([re]) => re.test(title))?.[1];
  return art ? new Blob([pixelArtSvg(art)], { type: 'image/svg+xml' }) : undefined;
}
