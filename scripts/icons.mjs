// Draws the favicon and the PWA icons from the pixel-art logo (src/ui/logoMarks.ts) into public/.
// Run after changing the logo: node scripts/icons.mjs
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { logoSvg } from '../src/ui/logoMarks.ts';

writeFileSync('public/favicon.svg', logoSvg('lid') + '\n');

const icons = [
  // Installed app: the rice pot on its rounded tomato tile.
  { file: 'icon-192.png', size: 192, svg: logoSvg('rice') },
  { file: 'icon-512.png', size: 512, svg: logoSvg('rice') },
  // Launchers that cut their own shape: square, with the pot inside the safe zone.
  { file: 'maskable-512.png', size: 512, svg: logoSvg('rice', { pad: 6, rounded: false }) },
  { file: 'apple-touch-icon.png', size: 180, svg: logoSvg('rice', { pad: 4, rounded: false }) },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, svg } of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
