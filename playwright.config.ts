import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Visual checks: key screens are compared with approved pictures in e2e/snapshots.
// `npm run test:visual` compares; `npm run test:visual:update` approves the current look.
// The pictures are taken on Windows, so they're checked locally (the pre-commit hook), not in CI.
// The main checkout serves on 5289. A git worktree (where .git is a file) gets its own port from its
// folder, so two checkouts running the checks at once never compare against each other's server.
const inWorktree = statSync('.git', { throwIfNoEntry: false })?.isFile() ?? false;
const port = inWorktree ? 5300 + (createHash('sha1').update(process.cwd()).digest().readUInt16BE(0) % 200) : 5289;

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
    reuseExistingServer: false,
  },
});
