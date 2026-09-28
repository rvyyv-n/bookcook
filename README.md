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

- **Tell it.** A gentle interview, one question at a time: the name, whose recipe it is, how many it feeds, the ingredients, the steps, tips and the story behind it. Ingredients appear as you say them, durations become timers, and the story is kept in the teller's own voice. Hands-free if you like.
- **Or just talk.** Talk while you cook; Bookcook sorts it into ingredients and steps for you to check, and keeps every word as "In her words".
- **Type it, paste it or bring a link.** Type recipes the way you'd say them (`2 cups basmati rice, washed`) with a live preview, paste messy text from WhatsApp or notes and have it tidied up, or import a recipe website's page. Whichever way, you check it on one screen before saving, and drafts save as you go.
- **Cook mode.** One step at a time in type you can read from across the kitchen. Steps are read aloud, and voice commands (next, back, repeat, timer, stop) move you along without touching the screen. The screen stays awake.
- **Timers.** Tap a duration in a step to start one. Several can run at once; under a minute they turn "hot", and a finished one chimes and speaks until you stop it. They survive a reload.
- **Ingredients that follow you.** Scale servings and switch metric or imperial, and every amount updates, including the one that pops up when you tap an ingredient in a step. Tick things off as you go.
- **A cookbook to browse.** Search, collections, tags, sorting, "Make Mine" copies of family recipes, grocery lists, sharing and printing.
- **Speak into any field.** Every text field has a Speak button.
- **I made it.** Rate it, note what to change next time, and add a photo to the cook log.
- **Grocery and requests.** One grocery list grouped by aisle, and requests for the recipes that only live in someone's head, sent as a link.
- **Safe and shareable.** Back up to a `.bookcook` file and restore it (add to the cookbook, or replace it). Share a recipe as a link that adds it to someone else's cookbook. Print the family cookbook.
- **Five looks.** Five skins, light and dark, two accents and three text sizes, up to Huge.

![Cook mode on a tablet, with the ingredients pinned beside the step](docs/images/tablet.jpg)

Still to come: an Android app, onboarding and a final polish, and the Cloudflare deploy that From a link needs. See the [roadmap](docs/roadmap.md).

## How it's built

React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Aria Components and Dexie (IndexedDB). There's no AI and no paid service: a rule-based parser turns spoken and typed recipes into structured ones, and the browser's own speech recognition and voices do the listening and speaking.

```
src/
  app/        routes, the app shell, providers, speech wiring, keyboard shortcuts
  features/   screens: library (cookbook, collections, tags), recipe, cook, capture (new recipe,
              Tell it, Just talk, Paste it, From a link), editor (Type it, Check your recipe), settings
  ui/         shared components, built on React Aria
  design/     the design handoff's tokens, theme, skins and icons
  db/         Dexie schema and repositories (the only database access)
  lib/
    parse/    the rule-based recipe parser (pure TypeScript, fixture-tested)
    speech/   listening and speaking behind one interface
    platform/ photos, voice recording, wake lock, the timer chime
  i18n/       every UI string and voice phrase
  styles/     Tailwind entry and print styles
functions/    the From a link import function (a Cloudflare Pages Function)
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

Open http://localhost:5173. The microphone works on `localhost` in Chrome and Edge, and the dev server also runs the From a link function at `/api/import`.

`node scripts/shot.mjs '<plan json>'` takes Playwright screenshots of the running dev server; the comment at the top of the file shows the options. `"fakeSpeech": true` swaps in a scripted recogniser, so voice screens can be driven with `__say('two onions')`, and `CHROMIUM=/path/to/chrome` points it at a browser when Playwright's own isn't installed.

On Windows, if `npm ci` fails with `EPERM ... lightningcss`, a running dev server still has the file open: stop it (Ctrl+C) and try again.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the tests, typecheck, lint and format check on every push and pull request. Pushes to `main` are then built with the `/bookcook/` base path and published to GitHub Pages. The service worker precaches the app so it works offline once installed.

From a link needs its function (`functions/api/import.ts`) deployed beside the app, which GitHub Pages can't do: there, every link ends in "We couldn't read that page" and Paste it still works. On Cloudflare Pages the `functions/` folder is picked up as is. To use a function hosted elsewhere, build with `VITE_IMPORT_URL` set to its address.
