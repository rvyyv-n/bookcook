# Roadmap

The tracker for what's built and what's next. The spec is [`bookcook-plan.md`](bookcook-plan.md) (product and architecture) plus the design handoff in [`design/`](design/) (screens, components, tokens). This file merges the plan's build phases with the handoff's build order into one sequence.

**Every screen is done when it passes [`design/ACCEPTANCE.md`](design/ACCEPTANCE.md)**: all 5 skins, light and dark, Normal / Large / Huge text, 390px phone and 1280px desktop, keyboard and screen reader. Each phase ends in a working, verified state and at least one commit.

## Where the app is now

A cookbook you can browse and cook from, in the handoff's design: the phone cookbook and the desktop three-pane view, recipe detail in every skin, collection and tag pages, and hands-free cook mode with timers and voice commands. You can search, filter, sort, scale, share, print, fork and add to the grocery list, and every text field has a Speak button. You can't add your own recipe yet.

It's live at **https://rvyyv-n.github.io/bookcook/** and installs as an app (PWA). Every push to `main` is checked and redeployed by GitHub Actions.

## Done

- [x] **Phase 1: Scaffold and data.** Vite, React, TypeScript, Tailwind, React Aria, the router, the Dexie schema and every repository (tested), i18n, and stubs for every route.
- [x] **Phase 2: Parser.** Rule-based parsing of ingredients, steps, timers, paste and just-talk, with a fixture corpus (`npm run parse:score`: 100% tuned, 72% on held-out text before tuning). Not yet wired to any screen.
- [x] **Phase 3: First design pass.** A placeholder look, the library (search, collections, tags, sorting), recipe detail and 3 example recipes behind "Try an example".
- [x] **Phase 4: Design handoff drop-in** (handoff step 1).
  - `src/design` adopted unchanged: 5 skins, light and dark, 2 accents, 3 text sizes, ingredient colours, lucide icons.
  - Base controls restyled: Button, TextField with a Speak slot, Segmented, Switch, Sheet, UndoToast.
  - The shell: the phone tab bar, the desktop sidebar with a three-pane cookbook, the `?` shortcuts sheet, and the handoff's routes.
  - Data model decisions: unsure-row checks, grocery ranges, request direction, a tips voice note, no collection emoji. See [`design/DECISIONS.md`](design/DECISIONS.md).
- [x] **Phase 5: Cookbook and recipe detail** (handoff step 2).
  - Cookbook: greeting, search with Speak / Clear, collection chips, draft and request cards, recipe cards (one column at Large and Huge), sort menu, empty and no-results states; the desktop list pane with the selected recipe beside it.
  - Recipe detail by skin: photo or field-band hero, Start cooking, the grid / list / icon-row actions, story card, spice-coloured ingredient sections, steps, tips, In her words, original card, cook log; the desktop two-column page.
  - Collections and Tags index and filtered pages.

## Next

### Phase 5 follow-up: review fixes

From the marked-up review of the Phase 5 build. Phase 5 is complete once these land.

- [x] Text size: Normal is a conventional 16px (a 100% root), Large about 19px, Huge about 23px. The text-size control is a pill like the others.
- [x] Cookbook list: shorter search field, smaller collection chips, more room between the header, chips and rows, no "Made N times" on rows.
- [x] Recipe detail: the story sits in the header as a smaller quote instead of a big card; "Make Mine".
- [x] Pixel-art pictures for the example recipes, used until someone adds a photo.
- [x] Collections: tiles with an icon, count and thumbnails; Edit to rename, pick an icon or delete; the recipes not in a collection below.
- [x] Tags: tiles with matching icons; the untagged recipes below.
- [x] Logo: a pixel-art pot on a rounded tile beside the wordmark (a cream rice pot on tomato in light mode, a tomato pot on ink in dark), and a plainer lidded pot as the favicon. The PWA icons in phase 10 use the same marks.

### Phase 6: Speech and cook mode (handoff step 3)

The hero screen. Needs the speech layer, so it's built here rather than with voice capture.

- [x] Speech layer, web implementation: listen and speak behind one interface (`src/lib/speech/`). Wiring it in also turns on every field's Speak button.
- [x] Cook mode (`/r/:id/cook`): step header by skin (bar or big numeral), step text at step size, ingredient mentions with a popover showing the scaled amount, the optional step photo.
- [x] Controls: Back · Read (becomes Stop) · Next (becomes **I made it** on the last step).
- [x] Timers: several at once, "hot" under a minute, paused by tapping, the TimerAlert with chime and speech, kept in `localStorage` so a reload doesn't lose them. Started by voice ("timer", "set a timer for 5 minutes") or T.
- [x] Starting a timer by touch: each duration in the step is a timer chip (tap to start; then its time left, tap to pause; then Done).
- [x] Voice commands (next, back, repeat, timer, stop) with the listening indicator; wake lock.
- [x] The ingredients sheet (checklist, stepper, units) and the I made it sheet (stars, note, photo), which writes the cook log.
- [x] Tablet and desktop layouts with the pinned ingredients aside.
- [x] Tested at Huge and in dark mode, and in Colour field (the whole screen on the accent field).

### Phase 7: New recipe and Type it (handoff step 4)

**Milestone: you can add your own recipes.** Together with phase 6, the app is useful for real.

- [ ] The New recipe chooser: a bottom sheet on phone, a dialog on desktop, the unsupported-speech state.
- [ ] Draft autosave (about 500ms) with the "Draft saved" indicator.
- [ ] Type it / Edit: Details, Ingredients, Steps and Story sections. SmartIngredientLine with the live parse preview and autocomplete; StepRow with Move (Up / Down) and drag, timer chips and mentions detected live, and step photos. Undo toasts for deletes.
- [ ] Review: editable cards, "Check this" rows from the parser's `check`, Save recipe.
- [ ] Desktop layouts and the editor shortcuts.

### Phase 8: Voice capture and imports (handoff step 5)

- [ ] Tell it: one question at a time, BigMicButton, live transcript, parsed rows, hands-free, undo, the mic-denied and unsupported states, the story prompt with a voice note.
- [ ] Just talk: free talk with an elapsed timer, then Review.
- [ ] Paste it: paste, "Tidy it up", then Review.
- [ ] From a link: a small serverless function that fetches the page, schema.org parsing, the failure state that points to Paste it.

### Phase 9: Grocery, requests, settings, print (handoff step 6)

- [ ] Grocery: grouped by aisle, check-offs, Clear checked with Undo, manual items, merged quantities with "From Biryani, Karahi".
- [ ] Requests: incoming ("Tell it now") and outgoing, the told state, Send request with a share link.
- [ ] Settings: the full design, including the backup nudge, the text-size preview, Look, About you, Voice, and Voice commands.
- [ ] Print: the family cookbook (cover, contents, recipe pages, story pages), always black on white, Letter and A4.

### Phase 10: Safety and sharing

**Milestone: safe for daily use.** Recipes can't be lost with the phone.

- [x] PWA manifest, icons and offline caching (`vite-plugin-pwa`; the icons are drawn from the logo by `scripts/icons.mjs`). Brought forward so the app can be installed and tested from GitHub Pages.
- [ ] `storage.persist()`, backup export and restore.
- [ ] Share links for a recipe and for a request.

### Phase 11: Android APK

- [ ] Capacitor, native speech recognition and text-to-speech, the microphone permission, a debug APK.

### Phase 12: Polish and launch

- [ ] Onboarding, motion details, a full accessibility pass.
- [x] A test deployment on GitHub Pages (`.github/workflows/deploy.yml`).
- [ ] Deploy to Cloudflare Pages, which the From a link import function needs.
- [ ] README with screenshots and GIFs, the parser accuracy figure and Lighthouse scores; the case-study outline.

## Later, not in this build

Meal planning, OCR of printed recipes, optional accounts and family sync, more languages, and optional AI cleanup with your own API key.
