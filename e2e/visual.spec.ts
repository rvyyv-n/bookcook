import { expect, test, type Page } from '@playwright/test';

// Each case walks the key screens with the example recipes and compares them with the approved pictures.
const SKINS = ['quiet', 'heirloom', 'spice-tin', 'colour-coded', 'colour-field'];
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

type Case = { name: string; skin: string; theme: 'light' | 'dark'; size: typeof PHONE; textSize?: string };

const cases: Case[] = [
  ...SKINS.flatMap((skin) => (['light', 'dark'] as const).map((theme) => ({ name: `phone-${skin}-${theme}`, skin, theme, size: PHONE }))),
  { name: 'phone-quiet-light-huge', skin: 'quiet', theme: 'light', size: PHONE, textSize: 'huge' },
  { name: 'desktop-quiet-light', skin: 'quiet', theme: 'light', size: DESKTOP },
  { name: 'desktop-quiet-dark', skin: 'quiet', theme: 'dark', size: DESKTOP },
];

/** Store settings the way the app does, then open the cookbook again so Dexie picks them up. */
async function applySettings(page: Page, settings: Record<string, unknown>) {
  await page.evaluate(
    (entries) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open('bookcook');
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          for (const [key, value] of entries) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => resolve();
        };
      }),
    Object.entries(settings),
  );
  // A first visit lands on the welcome, so go back to the cookbook rather than reloading.
  await page.goto('/');
}

/** Wait for the web fonts, which otherwise swap in mid-shot, then compare. */
async function snap(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  // A string, as this file is type-checked without the DOM types.
  await page.evaluate('document.fonts.ready');
  await expect(page).toHaveScreenshot(name);
}

for (const c of cases) {
  test(c.name, async ({ page }) => {
    // A fixed afternoon, so the greeting and "added N days ago" never change.
    await page.clock.setFixedTime(new Date('2026-06-10T15:00:00'));
    await page.setViewportSize(c.size);
    await page.emulateMedia({ colorScheme: c.theme });
    await page.goto('/');
    await applySettings(page, { onboarded: true, skin: c.skin, textSize: c.textSize ?? 'normal' });
    await page.getByRole('button', { name: 'Try an example' }).click();
    // The toast comes once all three are saved; then reload so it doesn't cover the screens.
    await page.getByText('Three example recipes added.').waitFor();
    await page.reload();
    await page.getByText("Mom's Chicken Biryani").first().waitFor();

    await snap(page, `${c.name}-cookbook.png`);

    await page.getByText("Mom's Chicken Biryani").first().click();
    // Phones open /r/:id; desktop shows the recipe beside the list at /?r=:id.
    await page.waitForURL(/\/r\/[^/]+$|[?&]r=/);
    const url = new URL(page.url());
    const id = url.searchParams.get('r') ?? url.pathname.split('/').pop();
    await snap(page, `${c.name}-recipe.png`);

    await page.goto(`/r/${id}/cook`);
    await snap(page, `${c.name}-cook.png`);

    await page.goto('/settings');
    await snap(page, `${c.name}-settings.png`);
  });
}
