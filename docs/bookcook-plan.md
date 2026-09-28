# Bookcook: recipes in their own words (implementation plan)

> The product and architecture spec. Build order and status live in [`roadmap.md`](roadmap.md). Make one commit (or more) per phase, and check each phase with the steps in **Verification** before moving on.

## Context
The author's mom cooks from memory and has never written her recipes down. **Bookcook** lets someone **say** a recipe out loud or **type** it naturally and get a clean, structured recipe. They can then cook from it later **hands-free**, with the app reading each step aloud and listening for "next". It's designed first for older users (big type, one clear action per screen, voice first), but it's a general, minimal, modern cookbook anyone can use. It's also a portfolio piece, so polish, accessibility and measurable engineering quality matter.

### Decisions already made (don't reopen)
- **English only for now**, but the architecture supports more languages: all UI strings and voice phrases live in locale files, and every recipe stores `lang`.
- **No AI and no paid services.** A local rule-based parser does the talk/type/paste-to-recipe work. The only server-side piece is one free Cloudflare Pages Function for importing recipes from websites.
- **Local-first and not tied to one family.** No account is needed. Sharing uses links and files, and cloud sync is a later add-on behind the repository layer.
- **Voice and typing are equally important.** Both must be easy and feel polished; neither is a fallback. They share one parser, one Draft model and one editor.
- **Three targets from one codebase:** an installable **PWA**, an **Android APK** (Capacitor), and **desktop** (the PWA installed from Chrome/Edge with a dedicated wide-screen layout). Tauri/Electron are rejected because their webviews lack speech recognition.
- **Design comes from a separate design handoff** (the user makes it in parallel; see "Design workflow"). Until it arrives, build the parts that don't depend on visuals.

### Environment
- Repo: the default branch is `main`.
- Windows 11, Node 24, npm 11, Python 3.13. Android SDK/JDK status unknown; check it in phase 9.
- Check current major versions of every library at install time rather than assuming them.

---

## Stack
| Concern | Choice | Why |
|---|---|---|
| App | **Vite + React + TypeScript** (strict) SPA | Static output, so one build serves the PWA, Capacitor and desktop |
| Components | **React Aria Components** | Unstyled and accessible (keyboard, focus, screen readers), so the look stays ours |
| Styling | **Tailwind CSS v4** + CSS variables in `src/design/tokens.css` | Tokens for colour, type scale, spacing, radius and motion; the root font-scale variable drives the text-size setting |
| Routing | react-router | |
| Storage | **Dexie (IndexedDB)** + `dexie-react-hooks` (`useLiveQuery`) | Local-first, stores Blobs, reactive; no global store needed |
| Search | MiniSearch | Fuzzy search that runs locally |
| Drag reorder | dnd-kit | Keyboard-accessible reordering |
| PWA | `vite-plugin-pwa` (Workbox) | Offline use and install |
| Backup / share | `fflate` (zip), `lz-string` (URL-fragment share links) | |
| Android | **Capacitor** + `@capacitor-community/speech-recognition` + `@capacitor-community/text-to-speech` | The Android WebView has no Web Speech recognition |
| Web import | Cloudflare Pages Function (`functions/api/import.ts`) | Free tier, stateless |
| Tests | Vitest + Testing Library + `fake-indexeddb`; Playwright smoke tests | |
| Hosting | Cloudflare Pages (static site + the function, HTTPS, which the mic requires) | |

---

## Design direction
The visual design is the design handoff in [`design/`](design/): screens, components, themes, copy and the [`ACCEPTANCE.md`](design/ACCEPTANCE.md) checklist, with the decisions taken on it in [`DECISIONS.md`](design/DECISIONS.md). Where the handoff and this plan differ on anything visual or on UI copy, the handoff wins. [`design-brief.md`](design-brief.md) is the brief that produced it ("warm editorial minimalism"). The code side lives in `src/design/` (see its README).
- **Heart:** recipes show "*From Mom's kitchen*" (the author's name) and can keep her **voice notes**, "**In her words**" transcript, **story** and **original card photo**. The app preserves a person, not just instructions.

## Information architecture and layouts
**Routes:** as listed in [`design/screen-map.md`](design/screen-map.md) and implemented in `src/app/App.tsx`, plus `/import#<payload>` for share-link import.

- **Phone and tablet (< 900px):** a bottom tab bar: **Cookbook · Grocery · [ + ] · Requests · Settings**.
  - The large centre **+** opens **New recipe**: four big choices, **Tell it**, **Type it**, **Paste it**, **From a link**, plus a quieter "Or just talk freely" link to just-talk. This is also the "quick add" (Things 3 style).
  - The library shows recipe cards in two columns at Normal text size and one column at Large and Huge; detail is a full screen.
- **Desktop (≥ 900px):** three panes.
  - **Left sidebar:** New recipe, Cookbook, Collections, Tags, Grocery, Requests, Settings.
  - **Middle:** a searchable recipe list.
  - **Right:** the selected recipe or the editor.
  - The editor shows ingredients and steps side by side.
  - Shortcuts: `/` search, `n` new, `e` edit, `c` cook, `Ctrl/⌘+S` save; in cook mode `←` `→`, `Space` (read), `t` (timers). Shortcuts are listed under `?`.
- **Cook mode, desktop/tablet landscape:** a fixed ingredients checklist on the left and a huge current step on the right.

---

## Features

### 1. Two ways in, one editor
Every creation path (Tell it, Type it, Paste it, From a link) writes into one **Draft**. The Draft is autosaved to IndexedDB on every change, and a "Continue your draft" card sits at the top of the library. All paths end in the same editor or review screen. Every text field in the editor has a small **dictate** mic button, so users can switch between typing and speaking freely.

### 2. Typed entry: fast and smart, never a plain form
- **Smart ingredient lines:** type naturally, e.g. `2 cups basmati rice, washed`.
  - A live preview under the line shows how it was understood (**2** · **cups** · basmati rice · *washed*).
  - `Enter` commits the line and opens the next one; `Backspace` on an empty line goes back.
  - A line ending in `:` (e.g. `For the sauce:`) becomes a section heading.
- **Autocomplete:** ingredient names come from the user's cookbook plus a built-in list of common ingredients, and units are suggested after a number. `Enter` always accepts exactly what was typed; suggestions never hijack input.
- **Steps:**
  - `Enter` starts a new step.
  - Durations in a step ("simmer 20 min") show inline as **timer chips** that can be edited or removed.
  - Ingredient names mentioned in a step are highlighted.
  - Each step can have an optional **step photo** ("it should look like this").
- **Smart paste** (`/new/paste`, or pasting into the empty editor): splits text from WhatsApp, Notes, email or websites into title, ingredients and steps for review. Handles bullets, numbering and "Ingredients"/"Method" headings.
- **Layouts:**
  - Phone: a focused one-section-at-a-time editor with a sticky Save bar.
  - Desktop: side by side and fully keyboard-driven (Tab/Enter, `Ctrl/⌘+↑↓` to reorder, `Ctrl/⌘+S` save, `Ctrl/⌘+Z` undo).
- Undo toasts, dnd-kit reordering, and photos from the camera or files, compressed on the client to about 1600px WebP.

### 3. Voice capture
**Guided "Tell it"** (the default). The app asks one question at a time, shows it in large text and optionally speaks it:
1. "What's this dish called?" (title)
2. "Whose recipe is this?" (author, defaulting to the last one used, e.g. "Mom")
3. "How many people does it feed?" (servings)
4. "Tell me the ingredients one at a time. Say **next** after each, **done** when finished." Each ingredient appears straight away as a parsed row, and "undo" / "remove that" deletes the last one.
5. "Now tell me how to make it, step by step. Say **next** between steps." Durations become timer chips.
6. "Any secrets or tips?", plus an optional **Record a voice note** (MediaRecorder).
7. Optional **story prompts** (see feature 8).
8. **Review:** large editable cards, tap anything to fix it, then Save.

**Just-talk (secondary mode):** a free-flowing monologue while cooking, producing a rough draft; guided Tell it is the reliable path. The full transcript is kept, `classify.ts` sorts sentences into ingredients and steps, and everything is fixed on the review screen.

- **Mic modes:** **tap to talk** (default, most reliable) and a **hands-free** toggle (continuous listening that restarts itself when recognition times out).
- The raw transcript is always saved as "**In her words**".
- **No speech support** (e.g. Firefox): the voice options say so plainly and point to Type it, and suggest the phone keyboard's mic button.

### 4. Parser (`src/lib/parse/`): pure TypeScript, no dependencies, heavily tested
| Module | Job |
|---|---|
| `numbers.ts` | Spoken and written numbers: "two and a half", "a quarter", "half a", "one to two", "a couple of", `1 1/2`, `½`, `1.5` |
| `units.ts` | Unit dictionary with aliases and plurals (cup, tbsp/"tablespoon"/"big spoon", tsp, g, kg, ml, l, oz, lb, clove, pinch, **handful**, splash, "to taste"). Vague units stay vague |
| `ingredient.ts` | One line → `{quantity, unit, name, note}`, e.g. "two onions, finely chopped" → `{2, –, onions, finely chopped}` |
| `steps.ts` | Splits speech into steps on cue words ("then", "after that", "next", "once that's done") |
| `timers.ts` | Durations: "for 10 minutes", "about half an hour", "1 hr 15"; "till golden" gives no timer |
| `commands.ts` | Voice commands: next / back / repeat / done / undo / ingredients / start timer / "set a timer for N minutes" / stop. Phrases come from the locale file |
| `classify.ts` | Sentence → ingredient (quantity or unit, short) or step (imperative verb: add, fry, boil, mix…) |
| `paste.ts` | Smart paste: headings, bullets and numbering first, then `classify.ts` |
| `mentions.ts` | Which of the recipe's ingredients each step mentions |
| `scale.ts` | Servings scaling with nice fractions (1½, not 1.5); vague amounts don't scale |
| `convert.ts` | Metric ⇄ imperial with sensible rounding; vague units untouched |
| `merge.ts` + `aisles.ts` | Grocery merging (2 onions + 1 onion = 3 onions, compatible units combined) and aisle grouping |
| `schemaOrg.ts` | schema.org `Recipe` JSON-LD → Draft (ISO-8601 durations, `HowToStep`/`HowToSection`), shared by the web import function |

Keep a **fixture corpus** (`src/lib/parse/__fixtures__/`) of realistic spoken, typed and pasted inputs with expected outputs. `npm run parse:score` prints an accuracy percentage for the README.

### 5. Speech layer (`src/lib/speech/`)
- **`SpeechInput`**: `isSupported()`, `start({lang, continuous})`, `stop()`, and events `onPartial / onFinal / onEnd / onError`.
  - Implementations: `webSpeechInput.ts` (Web Speech API with auto-restart) and `nativeSpeechInput.ts` (Capacitor plugin).
  - The implementation is chosen through `Capacitor.isNativePlatform()`.
- **`SpeechOutput`** (TTS): `speechSynthesis` and the Capacitor TTS plugin, with voice and rate settings (slower default rate).
- **`useSpeech()` hook:** state `idle | listening | processing | unsupported | denied`.
- **`BigMicButton`:** a clear pulsing ring plus text ("Listening…", "Tap to talk"). When mic permission is denied it shows plain-language recovery steps.

### 6. Cook mode (hands-free)
- One step at a time in huge text, with a progress bar and **Wake Lock**. Steps are read aloud automatically (this can be switched off).
- **Voice commands:** next, back, repeat, ingredients (reads the list), start timer, "set a timer for 5 minutes", stop.
- **Timers:** several can run at once, pinned at the top. When one ends there's a full-width alert, a repeating soft chime and a spoken "Your rice timer is done", until it's stopped (saying "stop" works too).
- **Ingredients:** a checklist, a **servings scaler** (±) and a **metric ⇄ imperial** toggle. Tapping a highlighted ingredient in a step shows its amount. Step photos are shown inline.
- **"I made it" log:** after the last step, a prompt asks for an optional rating, photo and note ("less chilli next time"). It updates `cookedCount` and `lastCookedAt`. Notes are private to the log and separate from the recipe text.

### 7. Cookbook
- **Library:** search, collections (e.g. "Mom's classics", "Eid") and tags. Sort by recent, A–Z, most cooked or recently cooked.
- **Recipe detail:**
  - Hero photo, "From *author*'s kitchen", times and servings.
  - **The story** (if any) near the top, then ingredients (with the scaler and unit toggle) and steps.
  - Tips, voice notes, "In her words", the **original card photo**, the cook log and "Based on…" (for forks).
- **My version:** a "Make Mine" button forks the recipe (`forkedFromId`). The fork shows "Based on Mom's Biryani", and the original lists its versions.

### 8. Family keepsake features
- **The story behind the dish:** optional prompts ("Who taught you this?", "When do you make it?", "Any memory with this dish?"), answered by voice or text, with optional audio. They appear in guided capture and in the editor.
- **Recipe requests (wish list):**
  - Add a request, e.g. "Mom's biryani", with an optional note.
  - It shows on the library home as "*Sam* would love to learn: **Biryani** · Tell it" (the requester's name is entered).
  - It can be sent as a share link, and is marked fulfilled when that recipe is saved.
- **Original card photo:** attach photos of the handwritten card or notebook page, shown beside the typed recipe.

### 9. Grocery list
Add a recipe's ingredients (at the current scale) to one list. Duplicates merge through `merge.ts`, items are grouped by aisle, and each can be checked off with a tap (with a satisfying animation). There's also "Clear checked" and manual items. Each item shows which recipes it came from.

### 10. Import from a website
- `/new/link`: the user pastes a URL, the app calls `functions/api/import.ts`, and the response is parsed with `schemaOrg.ts` into a Draft for review.
- **Function hardening:** only `http(s)` URLs; block private and loopback IP ranges; 5s timeout; 2 MB response cap; return only the extracted Recipe JSON. No storage, no logging of URLs.
- If extraction fails, fall back to "Paste the recipe text instead" (smart paste).

### 11. Keeping recipes safe and sharing them
- Call `navigator.storage.persist()` on the first save (these recipes are irreplaceable).
- **Backup and restore:**
  - A `.bookcook` file (a zip of JSON plus photos and audio, via `fflate`), with export and import (merge or replace).
  - A gentle Settings reminder after 30 days without a backup.
- **Share links:**
  - A recipe or request is compressed into the URL fragment (`lz-string`); photos and audio aren't included.
  - Opening the link shows "Add to my cookbook".
  - Uses the Web Share API where available.
- **Print:** single recipe cards, plus **"Print the family cookbook"**:
  - A cover page (title, e.g. "Mom's Kitchen", and an optional photo), then a contents page.
  - One recipe per page, with its story page when there is one.
  - Uses print CSS with page breaks.

### 12. Settings
Text size, theme (light/dark/system), read steps aloud, speech rate and voice, default author, language (English only for now), backup and restore, a mic permission helper, and keyboard shortcuts.

---

## Data model (`src/db/`)
The types are in `src/db/types.ts`, the source of truth: `Recipe`, `Draft`, `CookLog`, `GroceryItem`, `RecipeRequest`, `Collection`, `Media` and `Setting`, one Dexie table each.

All access goes through **repositories** (`src/db/recipes.ts`, `drafts.ts`, `grocery.ts`, `requests.ts`, `collections.ts`, `media.ts`, `settings.ts`). The UI never touches Dexie directly, which keeps a clean path to cloud sync later. Dexie schema versions must be migrated, never edited in place.

## Project structure
```
src/
  app/            routes, shell (phone tab bar, desktop sidebar), providers, shortcuts
  features/
    library/      list, search, collections, draft + request cards
    recipe/       detail, editor (typed entry), story, forks
    capture/      new-recipe chooser, guided tell, just-talk, paste, link, review
    cook/         cook mode, timers, scaler, unit toggle, cook log
    grocery/      grocery list
    requests/     recipe requests
    settings/     settings, backup/restore, share-link import, print
  lib/
    parse/        numbers, units, ingredient, steps, timers, commands, classify,
                  paste, mentions, scale, convert, merge, aisles, schemaOrg (+ tests, __fixtures__)
    speech/       SpeechInput/Output interfaces, web + native impls, useSpeech
    platform/     wakeLock, share, storagePersist, isNative, image compression
  db/             dexie schema + repositories
  ui/             Button, BigMicButton, Card, Sheet, TextField, Toast(Undo), TimerChip, Icon …
  i18n/           en.ts (UI strings + voice command phrases + story prompts)
  design/         tokens.css, theme.css, skin.ts, icons.ts: the design handoff drop-in (see its README)
  styles/         tailwind entry (maps tokens to utilities), print.css
functions/api/    import.ts (Cloudflare Pages Function)
android/          generated by Capacitor
```

---

## Design workflow
The design handoff was made from [`design-brief.md`](design-brief.md). Its docs are in [`design/`](design/), and its four code files sit in `src/design/`, kept byte-identical (see `src/design/README.md`). `src/ui/` and the screens are restyled against it, and a screen is done when it passes [`design/ACCEPTANCE.md`](design/ACCEPTANCE.md). A later handoff replaces `src/design/` wholesale.

Optional: the `/design-sync` skill can later push the coded component library back into the design tool's design-system project.

## Build phases
The scope of each area of work. The order they're built in, and their status, are in [`roadmap.md`](roadmap.md); each phase ends in a working, verified state.

1. **Scaffold and data:** Vite + React + TS (strict), Tailwind v4, React Aria, react-router, Dexie schema and all repositories (with `fake-indexeddb` tests), i18n scaffolding, a bare shell with every route stubbed, ESLint/Prettier, and Vitest.
2. **Parser:** every `lib/parse` module, the fixture corpus and `npm run parse:score`.
3. **Design system and library:** tokens, self-hosted fonts, text-size scale, dark mode, core `ui/` components, MobileShell and DesktopShell, library (search, collections, tags, sorting) and recipe detail. Seed 2–3 sample recipes behind "Try an example".
4. **Typed entry:** Draft autosave, the New recipe chooser, smart ingredient lines with live preview, autocomplete, the steps editor (timer chips, mention highlighting, step photos), smart paste, dnd-kit reorder, undo toasts, photos, and the mobile and desktop editor layouts with shortcuts.
5. **Voice capture:** the speech layer (web implementation), BigMicButton, guided Tell it, just-talk, review, voice notes, story prompts, transcript saving, and per-field dictate buttons in the editor.
6. **Cook mode:** TTS, voice commands, wake lock, multiple timers, scaler, unit toggle, ingredient tap-to-see-amount, and the "I made it" log.
7. **Kitchen extras:** grocery list (merge and aisles), recipe requests, original card photos, "My version" forks, and web import (the function plus `/new/link`).
8. **Safety and sharing:** PWA manifest, icons, offline caching, `storage.persist()`, backup export and import, share links (recipe and request), and print (a recipe card plus the family cookbook with cover, contents and story pages).
9. **Android APK:** check for the JDK and Android SDK (give setup steps if they're missing). Then `npx cap add android`, the native speech and TTS implementations, the `RECORD_AUDIO` permission, and a debug APK via `android\gradlew assembleDebug`.
10. **Polish and launch:**
    - Empty states and onboarding ("Let's save your first recipe" with one big button), motion details and a final accessibility pass.
    - Deploy to Cloudflare Pages.
    - README with screenshots and GIFs, the parser accuracy figure and Lighthouse scores.
    - A case-study outline in `docs/case-study.md` (problem → testing with Mom → what changed) for the user to fill in alongside a demo video.

**Later, not in this build:** meal planning, OCR scanning of printed recipes, optional accounts and cloud sync (Supabase free tier, shared family cookbooks with invite codes), more languages, and optional AI cleanup with a user-supplied API key (which would make just-talk genuinely reliable).

## Known platform limits (design around them)
- Web Speech recognition works in **Chrome, Edge and Android Chrome**. Safari support is partial and Firefox has none, so those get the typing path. Chrome streams audio to Google (free, but it needs internet). The APK uses Android's recognizer, which can work offline with language packs.
- Continuous recognition stops by itself after silence, so hands-free mode must restart it.
- Using the Web Speech API and MediaRecorder at the same time can conflict on Android. Voice notes are recorded separately from dictation.
- The mic needs HTTPS or localhost.
- Share links carry text only; backups carry everything.

## Verification
- **Unit:** `npm run test` (parser modules and repositories); `npm run parse:score` above the agreed baseline (aim for ≥ 90%).
- **Visual:** `npm run build && npm run preview`, then check each screen against [`design/ACCEPTANCE.md`](design/ACCEPTANCE.md) at **390px and 1280px** (cook mode also at 1180px). Screenshot library, detail, editor, capture, cook mode, grocery and requests in light and dark and at all three text sizes.
- **Typed run:** build a full recipe with the keyboard only on desktop; paste a messy WhatsApp-style recipe and check the split; reload mid-edit and confirm the draft is restored. Repeat at 390px.
- **Voice run (Chrome):** record a recipe with guided Tell it and with just-talk, fix it on review, save, then cook it hands-free with "next", "repeat" and "set a timer for 1 minute".
- **Extras:**
  - Add two recipes that share ingredients to the grocery list and confirm they merge.
  - Fork a recipe and confirm the "Based on" link.
  - Create a request, send it as a link, and fulfil it.
  - Import a URL from a major recipe site through the deployed function.
- **Safety:** export a backup, clear site data, import it, and confirm recipes, photos, voice notes, logs and grocery items all return. Do a share-link round trip in a second browser profile, and check the print preview of the family cookbook.
- **PWA:** Lighthouse (accessibility ≥ 95, installable), install to the home screen or desktop, reload offline.
- **APK:** install the debug APK on an Android phone and repeat the voice and cook mode runs with the native plugins.
