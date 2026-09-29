import { defineConfig } from '@playwright/test';

// Visual checks: key screens are compared with approved pictures in e2e/snapshots.
// `npm run test:visual` compares; `npm run test:visual:update` approves the current look.
// The pictures are taken on Windows, so they're checked locally (the pre-commit hook), not in CI.
const port = 5289;

export default defineConfig({
  testDir: 'e2e',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: `http://localhost:${port}`,
    reducedMotion: 'reduce',
  },
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 } },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
