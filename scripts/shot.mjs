// Dev helper: screenshot the running app with Playwright.
// "file": ["input[type=file]", "path/to/backup.bookcook"] picks a file for a file input.
// "fakeSpeech": true swaps in a scripted recogniser (scripts/fake-speech.js): {"eval":"__say('two onions')"}.
// node scripts/shot.mjs '{"path":"/","width":390,"height":844,"theme":"dark","textSize":"huge","settings":{"skin":"heirloom"},"actions":[{"click":"text=Try an example"}],"out":"shots/x.png"}'
// "grid" takes one shot per combination and saves them as one labelled image; the last key runs across, the others down.
// Keys are theme, width, height or any setting; "cell" is each shot's height in the grid (default 420).
// node scripts/shot.mjs '{"path":"/","grid":{"textSize":["normal","huge"],"theme":["light","dark"],"skin":["quiet","heirloom"]},"out":"shots/grid.jpg"}'
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const plan = JSON.parse(process.argv[2]);
const base = process.env.BASE ?? 'http://127.0.0.1:5288';
const url = base + (plan.path ?? '/');
const ctx = await chromium.launchPersistentContext(join(tmpdir(), 'bookcook-shots-profile'), {
  viewport: { width: plan.width ?? 390, height: plan.height ?? 844 },
  deviceScaleFactor: plan.scale ?? 1,
  colorScheme: plan.theme === 'dark' ? 'dark' : 'light',
  reducedMotion: 'reduce',
  permissions: ['microphone'],
  // CHROMIUM=/path/to/chrome when Playwright's own browser isn't installed.
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});
if (plan.fakeSpeech) await ctx.addInitScript({ path: new URL('./fake-speech.js', import.meta.url).pathname });
const page = ctx.pages()[0] ?? (await ctx.newPage());
const logs = [];
let label = '';
const log = (line) => logs.push(label ? `[${label}] ${line}` : line);
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && log(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => log(`pageerror: ${e.message}`));
// "route": {"match":"**/api/import**","json":{…},"status":200} answers a request without the network.
if (plan.route) await page.route(plan.route.match, (r) => r.fulfill({ status: plan.route.status ?? 200, json: plan.route.json }));
await page.goto(url);
if (plan.reset) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((r) => {
            const q = indexedDB.deleteDatabase(d.name);
            q.onsuccess = q.onerror = q.onblocked = r;
          }),
      ),
    );
  });
  await page.goto(url);
}

// Every combination of the grid's values, e.g. {theme:[light,dark],skin:[a,b]} gives 4.
const combos = (grid) =>
  Object.entries(grid).reduce((acc, [key, values]) => acc.flatMap((c) => values.map((v) => ({ ...c, [key]: v }))), [{}]);

async function capture(variant) {
  const { theme = plan.theme, width = plan.width ?? 390, height, ...rest } = variant;
  await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
  await page.setViewportSize({ width, height: height ?? plan.height ?? 844 });
  if (plan.grid) await page.goto(url);
  // Settings to store before the shot, e.g. {"skin":"heirloom","accent":"saffron"}. `textSize` is a shorthand.
  // The welcome is marked seen so `/` shows the cookbook; {"onboarded":false} brings it back.
  const settings = { onboarded: true, ...plan.settings, ...(plan.textSize ? { textSize: plan.textSize } : {}), ...rest };
  await page.evaluate(
    (entries) =>
      new Promise((res) => {
        const open = indexedDB.open('bookcook');
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          for (const [key, value] of entries) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => res();
        };
      }),
    Object.entries(settings),
  );
  // Dexie doesn't see writes made outside it, so reload to pick them up.
  await page.reload();
  await page.waitForTimeout(400);
  for (const a of plan.actions ?? []) {
    if (a.click) await page.locator(a.click).first().click();
    if (a.type) await page.locator(a.type[0]).first().fill(a.type[1]);
    if (a.file) await page.locator(a.file[0]).first().setInputFiles(a.file[1]);
    if (a.keys) await page.keyboard.type(a.keys, { delay: 20 });
    if (a.press) await page.keyboard.press(a.press);
    if (a.goto) await page.goto(base + a.goto);
    if (a.eval) log('eval: ' + JSON.stringify(await page.evaluate(a.eval)));
    await page.waitForTimeout(a.wait ?? 300);
  }
}

if (plan.out) mkdirSync(dirname(plan.out), { recursive: true });
if (plan.grid) {
  const keys = Object.keys(plan.grid);
  const shots = [];
  for (const variant of combos(plan.grid)) {
    label = keys.map((k) => variant[k]).join(' · ');
    await capture(variant);
    shots.push({ label, png: (await page.screenshot({ fullPage: plan.full ?? false })).toString('base64') });
  }
  label = '';
  const columns = plan.grid[keys.at(-1)].length;
  const cell = plan.cell ?? 420;
  const cells = shots
    .map((s) => `<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.png}" style="height:${cell}px"></figure>`)
    .join('');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(
    `<style>body{margin:0;background:#ddd;font:600 14px system-ui}main{display:grid;grid-template-columns:repeat(${columns},max-content);gap:16px;padding:16px;width:max-content}figure{margin:0}figcaption{margin-bottom:4px}img{display:block;box-shadow:0 0 0 1px #999}</style><main>${cells}</main>`,
  );
  const size = await page.evaluate(() => ({ width: document.body.scrollWidth, height: document.body.scrollHeight }));
  await page.setViewportSize(size);
  if (plan.out) await page.screenshot({ path: plan.out, fullPage: true, ...(/\.jpe?g$/.test(plan.out) ? { quality: 80 } : {}) });
} else {
  await capture({});
  if (plan.out) await page.screenshot({ path: plan.out, fullPage: plan.full ?? false });
}
if (plan.out) console.log('saved', plan.out);
if (plan.text && !plan.grid) console.log((await page.locator('body').innerText()).slice(0, 3000));
if (logs.length) console.log(logs.join('\n'));
await ctx.close();
