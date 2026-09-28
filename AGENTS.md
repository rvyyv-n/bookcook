# Working on Bookcook

A voice-first family recipe app: React 19, TypeScript, Vite, Tailwind v4, React Aria, Dexie (IndexedDB). No backend.

## Where things are decided

- [`docs/bookcook-plan.md`](docs/bookcook-plan.md): product and architecture.
- [`docs/design/`](docs/design/): the design handoff (screens, components, tokens). It wins over the plan and the brief on anything visual. Decisions taken on it are in `DECISIONS.md`.
- [`docs/roadmap.md`](docs/roadmap.md): what's built and what's next. Tick items off as they land.

## Rules

- **Design values live only in `src/design/`.** `tokens.css`, `theme.css`, `skin.ts` and `icons.ts` stay byte-identical to the handoff; adapt the app to them. New design values that belong with the design (like motion) go in an app-owned file beside them, `motion.css`. Component styling lives in `src/ui/`; screens compose `src/ui` and don't style controls themselves. See `src/design/README.md`.
- Size in rem (1rem = 16px at Normal) so Large and Huge text reflow. Borders are inset box-shadows.
- One primary button per screen. Icons render through `src/ui/Icon.tsx`.
- Every user-facing string goes in `src/i18n/en.ts`.
- IndexedDB is only touched through the repositories in `src/db/`. Schema changes need a new Dexie version with an upgrade.
- A screen is done when it passes [`docs/design/ACCEPTANCE.md`](docs/design/ACCEPTANCE.md): all 5 skins, light and dark, Normal / Large / Huge, 390px and 1280px, keyboard and screen reader.

## Checks

Run before every commit; all must pass:

```sh
npm test && npm run typecheck && npm run lint && npx prettier --check . && npm run build
```

## Looking at the app

Start `npm run dev -- --port 5288`, then screenshot with `node scripts/shot.mjs '<json>'`. The JSON sets the path, viewport, theme, text size, any setting (`"settings":{"skin":"heirloom"}`) and click actions; the example is at the top of the script.

## Commits

Commits are authored and committed as `rvyyv-n <296653698+rvyyv-n@users.noreply.github.com>` only. Commit messages and PR descriptions carry no co-author, session-link or generated-by lines.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) runs the checks on every push and publishes `main` to GitHub Pages under `/bookcook/`. Anything that builds a URL by hand must go through `import.meta.env.BASE_URL` (the router already uses it as its basename). After changing the logo, run `npm run icons` to redraw the favicon and app icons.
