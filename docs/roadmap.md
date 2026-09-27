# Roadmap

The tracker for what's built and what's next. The spec is [`bookcook-plan.md`](bookcook-plan.md) (product and architecture) plus the design handoff in [`design/`](design/) (screens, components, tokens). This file merges the plan's build phases with the handoff's build order into one sequence.

**Every screen is done when it passes [`design/ACCEPTANCE.md`](design/ACCEPTANCE.md)**: all 5 skins, light and dark, Normal / Large / Huge text, 390px phone and 1280px desktop, keyboard and screen reader. Each phase ends in a working, verified state and at least one commit.

## Where the app is now

A cookbook you can browse in the handoff's design: the phone cookbook and the desktop three-pane view, recipe detail in every skin, and collection and tag pages. You can search, filter, sort, scale, share, print, fork and add to the grocery list. You can't add your own recipe or cook from one yet, and nothing listens or speaks.

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

### Phase 5 follow-up: match the handoff exactly

Feedback on the Phase 5 build: the cookbook and recipe detail must look **exactly** like the handoff screenshots (`design_handoff/…/screenshots/home` and `cook`), and everything currently feels **a bit too big**.

- [ ] Compare side by side with the screenshots at the same viewport (390×844 phone, 1280×800 desktop) in every skin, and fix each difference in size, spacing, weight and layout.
- [ ] Sizing: check why things read larger than the mocks. Candidates: the 112.5% base (it equals the mocks' 18px only at the browser's default 16px), `min-h`/padding values rounded up to the 4px grid, the desktop body cap, and the browser zoom used when viewing.
- [ ] Recheck the collection chips and the selected list row in Spice Tin against the mock.
- [ ] Collection chips: make them more concise (tighter padding and height, smaller gaps) so they sit on fewer lines, matching the mock's proportions.
- [ ] Default text size: make Normal a conventional 16px (a 100% root instead of 112.5%), then update the text-size labels in Settings and the "1rem = 18px" notes in the docs.
- [ ] Go through the marked-up screenshots of the build for the remaining fixes and comments.

### Phase 6: Speech and cook mode (handoff step 3)

The hero screen. Needs the speech layer, so it's built here rather than with voice capture.

- [ ] Speech layer, web implementation: listen and speak behind one interface. Wiring it in also turns on every field's Speak button.
- [ ] Cook mode (`/r/:id/cook`): step header by skin (bar or big numeral), step text at step size, ingredient mentions with a popover showing the scaled amount, the optional step photo.
- [ ] Controls: Back · Read (becomes Stop) · Next (becomes **I made it** on the last step).
- [ ] Timers: several at once, "hot" under a minute, the TimerAlert with chime and speech, kept in `localStorage` so a reload doesn't lose them.
- [ ] Voice commands (next, back, repeat, timer, stop) with the listening indicator; wake lock.
- [ ] The ingredients sheet (checklist, stepper, units) and the I made it sheet (stars, note, photo), which writes the cook log.
- [ ] Tablet and desktop layouts with the pinned ingredients aside.
- [ ] Tested at Huge and in dark mode, and in Colour field (the whole screen on the accent field).

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

- [ ] PWA manifest, icons and offline caching.
- [ ] `storage.persist()`, backup export and restore.
- [ ] Share links for a recipe and for a request.

### Phase 11: Android APK

- [ ] Capacitor, native speech recognition and text-to-speech, the microphone permission, a debug APK.

### Phase 12: Polish and launch

- [ ] Onboarding, motion details, a full accessibility pass.
- [ ] Deploy to Cloudflare Pages.
- [ ] README with screenshots and GIFs, the parser accuracy figure and Lighthouse scores; the case-study outline.

## Later, not in this build

Meal planning, OCR of printed recipes, optional accounts and family sync, more languages, and optional AI cleanup with your own API key.
