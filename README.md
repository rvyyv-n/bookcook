# Bookcook

**A cookbook you can talk to.**

Talk a recipe in. Cook it hands-free. A local-first cookbook (PWA, later Android and desktop): save recipes by talking or typing, then cook from them with voice commands. Everything is stored on the device in IndexedDB; there's no account or server.

Status: in progress. See [`docs/bookcook-plan.md`](docs/bookcook-plan.md) for the full plan and build phases.

## Scripts

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `npm run dev`         | Start the dev server                                               |
| `npm run build`       | Typecheck and build to `dist/`                                     |
| `npm run preview`     | Serve the production build                                         |
| `npm test`            | Run the Vitest suite                                               |
| `npm run typecheck`   | TypeScript only                                                    |
| `npm run lint`        | ESLint                                                             |
| `npm run format`      | Prettier                                                           |
| `npm run parse:score` | Parser accuracy on the fixture corpus (`--verbose` lists failures) |

`node scripts/shot.mjs '<plan json>'` takes Playwright screenshots of the running dev server (a development helper; see the comment at the top of the file).

## Structure

```
src/
  app/        routes, shells, providers, keyboard shortcuts
  features/   library, recipe, editor, settings
  lib/parse/  rule-based recipe parser (pure TypeScript, fixture-tested)
  db/         Dexie schema and repositories (the only database access)
  design/     replaceable design layer: tokens.css, fonts.css
  ui/         shared components (React Aria)
  i18n/       UI strings and voice phrases
  styles/     Tailwind entry and print styles
docs/         plan and design brief
scripts/      parser scoring, screenshot helper
```

## Design

The visual design comes from the design tool, briefed by [`docs/design-brief.md`](docs/design-brief.md). The current look is a placeholder. The handoff replaces `src/design/`; see [`src/design/README.md`](src/design/README.md) for the token contract and import steps.

## Parser

`npm run parse:score` currently scores 100% on the tuned fixture corpus. The held-out set scored 72% before any tuning.
