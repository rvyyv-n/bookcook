import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { ART, pixelArtSvg } from '../src/features/library/pixelArt';
import { logoSvg, pixels, type LogoVariant } from '../src/ui/logoMarks';

/**
 * The website: plain pages that borrow the app's design tokens, fonts, logo and recipe parser, so what
 * it shows is what the app does. `<!-- logo:rice -->` and `<!-- art:biryani -->` in a page become the
 * app's own pixel drawings, inlined at build time.
 */
const pixelDrawings: Plugin = {
  name: 'bookcook-site-drawings',
  transformIndexHtml(html) {
    return (
      html
        .replace(/<!--\s*logo:(\w+)\s*-->/g, (_, v: string) =>
          logoSvg(v as LogoVariant).replace('<svg ', '<svg class="mark" aria-hidden="true" focusable="false" '),
        )
        // The logo's pot without its tile, big; the steam (the top rows) can be animated on its own.
        .replace(/<!--\s*pot:(\w+)\s*-->/g, (_, v: string) => {
          const rects = pixels(v as LogoVariant)
            .map((p) => `<rect${p.y < 5 ? ' class="steam"' : ''} x="${p.x}" y="${p.y}" width="1.03" height="1.03" fill="${p.fill}"/>`)
            .join('');
          return `<svg class="pot" viewBox="0 0 20 20" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
        })
        .replace(/<!--\s*art:(\w+)\s*-->/g, (_, name: string) => {
          const art = ART.find(([re]) => re.test(name))?.[1];
          if (!art) throw new Error(`No pixel art called ${name}`);
          return pixelArtSvg(art).replace('<svg ', '<svg class="art" aria-hidden="true" focusable="false" ');
        })
    );
  },
};

const page = (path: string) => resolve(import.meta.dirname, path);

export default defineConfig({
  root: import.meta.dirname,
  base: './',
  plugins: [pixelDrawings],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: page('index.html'),
        directions: page('directions/index.html'),
        'say-it': page('directions/say-it.html'),
        'hands-free': page('directions/hands-free.html'),
        'in-her-words': page('directions/in-her-words.html'),
      },
    },
  },
});
