// Dev helper: screenshot the running app with Playwright.
// node scripts/shot.mjs '{"path":"/","width":390,"height":844,"theme":"dark","textSize":"huge","actions":[{"click":"text=Try an example"}],"out":"shots/x.png"}'
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const plan = JSON.parse(process.argv[2]);
const base = process.env.BASE ?? 'http://127.0.0.1:5288';
const ctx = await chromium.launchPersistentContext(join(tmpdir(), 'bookcook-shots-profile'), {
  viewport: { width: plan.width ?? 390, height: plan.height ?? 844 },
  deviceScaleFactor: plan.scale ?? 1,
  colorScheme: plan.theme === 'dark' ? 'dark' : 'light',
  reducedMotion: 'reduce',
  permissions: ['microphone'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const logs = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(base + (plan.path ?? '/'));
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
  await page.goto(base + (plan.path ?? '/'));
}
if (plan.textSize) {
  await page.evaluate(
    (s) =>
      new Promise((res) => {
        const open = indexedDB.open('bookcook');
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'textSize', value: s });
          tx.oncomplete = () => res();
        };
      }),
    plan.textSize,
  );
}
await page.waitForTimeout(400);
for (const a of plan.actions ?? []) {
  if (a.click) await page.locator(a.click).first().click();
  if (a.type) await page.locator(a.type[0]).first().fill(a.type[1]);
  if (a.keys) await page.keyboard.type(a.keys, { delay: 20 });
  if (a.press) await page.keyboard.press(a.press);
  if (a.goto) await page.goto(base + a.goto);
  if (a.eval) console.log('eval:', JSON.stringify(await page.evaluate(a.eval)));
  await page.waitForTimeout(a.wait ?? 300);
}
if (plan.out) {
  mkdirSync(dirname(plan.out), { recursive: true });
  await page.screenshot({ path: plan.out, fullPage: plan.full ?? false });
  console.log('saved', plan.out);
}
if (plan.text) console.log((await page.locator('body').innerText()).slice(0, 3000));
if (logs.length) console.log(logs.join('\n'));
await ctx.close();
