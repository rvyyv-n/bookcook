# Roadmap

The tracker for what's built and what's next. The spec is [`bookcook-plan.md`](bookcook-plan.md) (product and architecture) plus the design handoff in [`design/`](design/) (screens, components, tokens). This file merges the plan's build phases with the handoff's build order into one sequence.

**Every screen is done when it passes [`design/ACCEPTANCE.md`](design/ACCEPTANCE.md)**: all 5 skins, light and dark, Normal / Large / Huge text, 390px phone and 1280px desktop, keyboard and screen reader. Each phase ends in a working, verified state and at least one commit.

## Where the app is now

A styled, browsable cookbook that only reads recipes. You can search, filter and open the example recipes, scale them and add them to the grocery list, and switch every appearance setting. You can't add your own recipe or cook from one yet, and nothing listens or speaks.

## Done

- [x] **Phase 1: Scaffold and data.** Vite, React, TypeScript, Tailwind, React Aria, the router, the Dexie schema and every repository (tested), i18n, and stubs for every route.
- [x] **Phase 2: Parser.** Rule-based parsing of ingredients, steps, timers, paste and just-talk, with a fixture corpus (`npm run parse:score`: 100% tuned, 72% on held-out text before tuning). Not yet wired to any screen.
- [x] **Phase 3: First design pass.** A placeholder look, the library (search, collections, tags, sorting), recipe detail and 3 example recipes behind "Try an example".
- [x] **Phase 4: Design handoff drop-in** (handoff step 1).
  - `src/design` adopted unchanged: 5 skins, light and dark, 2 accents, 3 text sizes, ingredient colours, lucide icons.
  - Base controls restyled: Button, TextField with a Speak slot, Segmented, Switch, Sheet, UndoToast.
  - The shell: the phone tab bar, the desktop sidebar with a three-pane cookbook, the `?` shortcuts sheet, and the handoff's routes.
  - Data model decisions: unsure-row checks, grocery ranges, request direction, a tips voice note, no collection emoji. See [`design/DECISIONS.md`](design/DECISIONS.md).

## Next

### Phase 5: Cookbook and recipe detail (handoff step 2)

Turns the two screens that already work into the design. Mostly visual; the data is there.

**Cookbook, phone** (`/`)

- [ ] Greeting ("Good evening", display 3xl) and a search field with Speak.
- [ ] Collection chips in one horizontally scrolling row (56px pills, selected in ink).
- [ ] DraftCard (`--sunk`: "Continue your draft", title, "Started 2 days ago", ink Continue) and RequestCard (`--accent-soft`: "Rayyan would love to learn", title, Tell it).
- [ ] "All recipes · 5" with a Recent sort button, replacing the current dropdown.
- [ ] RecipeCard: a 4:3 photo or a striped placeholder, the title in display lg, "Mom · 1 hr 45 min", then "Made 12 times" or "Based on Mom's Pasta". The whole card is one link.
- [ ] Two columns of cards at Normal, **one column at Large and Huge**.
- [ ] Empty state: "Your cookbook is empty", "Every family has a recipe worth keeping.", **Let's save your first recipe**.
- [ ] No results: "No “nihari” here yet", and when an open request matches, "Rayan already asked for it…" with Tell it and Ask for it.

**Cookbook, desktop**

- [ ] The list pane: greeting, search with the "/" hint, wrapping chips, one combined request-and-draft card, and rows with 64px thumbnails. The selected row is surface with a shadow.
- [ ] The detail pane shows the selected recipe.

**Collections and Tags** (`/c`, `/c/:id`, `/t`, `/t/:tag`)

- [ ] Index pages listing collections and tags, and filtered recipe lists for one of each, replacing the placeholders.

**Recipe detail** (`/r/:id`)

- [ ] Hero by skin: a 300px bleed photo with a floating Back, or in Colour field the title on the accent field band (`data-surface="field"`) with the photo below it.
- [ ] Title block: display 3xl title, the "From Mom's kitchen" eyebrow, "Serves 6 · Prep 30 min · Cook 1 hr 15 min", tag links. Start-aligned or centred by skin.
- [ ] **Start cooking** (XL, full width), then the secondary actions laid out by skin (2-column grid, ruled list, or icon row): Edit · Make my version · Add to grocery · Share · Print.
- [ ] No photo or forked: no hero, and a "Based on **Mom's Pasta**" row above Start cooking.
- [ ] Story card: the prompt, the quote in display italic xl, and a VoiceNotePlayer ("Play · 0:48").
- [ ] Ingredients: ServingsStepper and Metric/Imperial restyled, section headings with spice colours (a dot and hairline in the quiet skins, coloured text in the Tin skins), **Add to grocery**.
- [ ] Steps numbered at lg size, Tips, the collapsible **In her words** panel in the handwritten face, and the Original card photo.
- [ ] "Made 12 times": cook log rows with date, rating and note.
- [ ] Headings follow the skin's heading tokens (Heirloom centres them in small caps between rules).
- [ ] Desktop: the title block (display 4xl) and actions beside a 420px photo, then ingredients (0.85fr) beside the story and steps (1.15fr).

**Done when:** both screens match the handoff screenshots in every skin and pass the acceptance checklist.

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
