# Bookcook

**A cookbook you can talk to.**

Talk a recipe in. Cook it hands-free. A local-first cookbook (PWA, later Android and desktop): save recipes by talking or typing, then cook from them with voice commands. Everything is stored on the device in IndexedDB; there's no account or server.

Status: in progress. [`docs/roadmap.md`](docs/roadmap.md) tracks what's built and what's next; [`docs/bookcook-plan.md`](docs/bookcook-plan.md) is the full plan.

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
  design/     design handoff drop-in: tokens, theme, skins, icons
  ui/         shared components (React Aria)
  i18n/       UI strings and voice phrases
  styles/     Tailwind entry and print styles
docs/         plan, roadmap, design brief; design/ holds the handoff docs
scripts/      parser scoring, screenshot helper
```

## Design

The visual design comes from a design handoff: five skins, light and dark, two accents and three text sizes. Its docs (screens, components, themes, acceptance checklist) are in [`docs/design/`](docs/design/), with the decisions taken on it in [`DECISIONS.md`](docs/design/DECISIONS.md). The design values live only in `src/design/`; see [`src/design/README.md`](src/design/README.md) for how they're wired.

## Parser

`npm run parse:score` currently scores 100% on the tuned fixture corpus. The held-out set scored 72% before any tuning.
