<div align="center">

<img src="public/icons/icon-192.png" alt="" width="96" height="96" />

# Bookcook

**A cookbook you can talk to.**

[Try it](https://rvyyv-n.github.io/bookcook/) · [Roadmap](docs/roadmap.md) · [Design docs](docs/design/)

[![Check and deploy](https://github.com/rvyyv-n/bookcook/actions/workflows/deploy.yml/badge.svg)](https://github.com/rvyyv-n/bookcook/actions/workflows/deploy.yml)

</div>

Save the recipes that only live in someone's head by saying them out loud or typing them the way you'd tell a friend, then cook from them hands-free. Bookcook is built for the family cook who wears reading glasses and has busy hands: very large text, big targets, and voice for everything.

It's local-first. Recipes live on the device in IndexedDB, with no account and no server.

**Try it: [rvyyv-n.github.io/bookcook](https://rvyyv-n.github.io/bookcook/)**. Tap _Try an example_ for three sample recipes. Voice needs Chrome or Edge. Install it from the browser menu to use it as an app, offline too.

![Cookbook, recipe and cook mode on a phone, in the Quiet and Colour field skins](docs/images/phone.jpg)

## What it does

- **Cook mode.** One step at a time in type you can read from across the kitchen. Steps are read aloud, and voice commands (next, back, repeat, timer, stop) move you along without touching the screen. The screen stays awake.
- **Timers.** Tap a duration in a step to start one. Several can run at once; under a minute they turn "hot", and a finished one chimes and speaks until you stop it. They survive a reload.
- **Ingredients that follow you.** Scale servings and switch metric or imperial, and every amount updates, including the one that pops up when you tap an ingredient in a step. Tick things off as you go.
- **A cookbook to browse.** Search, collections, tags, sorting, "Make Mine" copies of family recipes, grocery lists, sharing and printing.
- **Speak into any field.** Every text field has a Speak button.
- **I made it.** Rate it, note what to change next time, and add a photo to the cook log.
- **Five looks.** Five skins, light and dark, two accents and three text sizes, up to Huge.

![Cook mode on a tablet, with the ingredients pinned beside the step](docs/images/tablet.jpg)

Still to come: telling a new recipe by voice (a guided interview or free talk), typing and pasting recipes, importing from a link, the grocery and requests screens, backups and share links, and an Android app. See the [roadmap](docs/roadmap.md).

## How it's built

React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Aria Components and Dexie (IndexedDB). There's no AI and no paid service: a rule-based parser turns spoken and typed recipes into structured ones, and the browser's own speech recognition and voices do the listening and speaking.

```
src/
  app/        routes, the app shell, providers, speech wiring, keyboard shortcuts
  features/   screens: library (cookbook, collections, tags), recipe, cook, editor, settings
  ui/         shared components, built on React Aria
  design/     the design handoff's tokens, theme, skins and icons
  db/         Dexie schema and repositories (the only database access)
  lib/
    parse/    the rule-based recipe parser (pure TypeScript, fixture-tested)
    speech/   listening and speaking behind one interface
    platform/ photos, wake lock, the timer chime
  i18n/       every UI string and voice phrase
  styles/     Tailwind entry and print styles
docs/         plan, roadmap, design brief; design/ holds the design handoff's docs
scripts/      parser scoring, app icons, screenshot helper
```

The parser scores 100% on its tuned fixture corpus (`npm run parse:score`); the held-out set scored 72% before any tuning.

![The desktop cookbook: sidebar, recipe list and the selected recipe](docs/images/desktop.jpg)

## Design

The visual design comes from a design handoff. Its docs (screens, components, themes and the acceptance checklist) are in [`docs/design/`](docs/design/), with the decisions taken on it in [`DECISIONS.md`](docs/design/DECISIONS.md). Design values live only in `src/design/`; [`src/design/README.md`](src/design/README.md) explains how they're wired.

## Development

```sh
npm install
npm run dev
```

| Command               | What it does                                                           |
| --------------------- | ---------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                                   |
| `npm run build`       | Typecheck and build to `dist/`                                         |
| `npm run preview`     | Serve the production build                                             |
| `npm test`            | Run the Vitest suite                                                   |
| `npm run typecheck`   | TypeScript only                                                        |
| `npm run lint`        | ESLint                                                                 |
| `npm run format`      | Prettier                                                               |
| `npm run parse:score` | Parser accuracy on the fixture corpus (`--verbose` lists failures)     |
| `npm run icons`       | Redraw the favicon and app icons from the logo (`src/ui/logoMarks.ts`) |

`node scripts/shot.mjs '<plan json>'` takes Playwright screenshots of the running dev server; the comment at the top of the file shows the options.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the tests, typecheck, lint and format check on every push and pull request. Pushes to `main` are then built with the `/bookcook/` base path and published to GitHub Pages. The service worker precaches the app so it works offline once installed.
