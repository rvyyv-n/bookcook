# Decisions on the design handoff

The other files in this folder are copied verbatim from the design handoff. The rest of the package (the HTML prototypes and the screenshots) isn't kept in the repo; paths in the copied docs such as `design/*.dc.html` and `screenshots/` refer to it. Its stock photo was removed: the example recipes use pixel-art pictures instead.

## Design

- **`src/design` is adopted unchanged.** `tokens.css`, `theme.css`, `skin.ts` and `icons.ts` are byte-identical to the handoff, and the app adapts to them.
- **Folder layout stays ours** (`src/db`, `src/lib/parse`, `src/features/*`), not the handoff's suggested `src/data`.
- **Base text size is `100%`** (16px at the browser default), not the tokens' fixed `18px`: a conventional reading size, and the browser's font-size setting still applies. It's set in `src/styles/index.css` and still multiplied by `--text-scale`, so Large is about 19px and Huge about 23px. Everything sized in rem is about 11% smaller than the mocks, which are drawn at 18px.
- **Tomato stays as designed** (white on tomato is 5.7:1, AA). The darker #9E3521 that would reach AAA isn't used.
- **The default skin is Quiet** (The Quiet Page).
- **Cookbook cards: one column at Large and Huge on phones** (two columns at Normal, as in the mocks).

## Backend suggestions

| # | Suggestion | Decision |
|---|---|---|
| 1, 2 | Mark unsure rows on Review, with a reason | `check?: { reason, heard? }` on `ParsedIngredient` / `ParsedStep` (and on draft `Ingredient` / `Step`, dropped on save). `reason` is `'unknownWord' \| 'twoAmounts' \| 'unclear'`. |
| 3 | Persist running timers | Mirror them to `localStorage` (cook mode). |
| 4 | `Collection.emoji` isn't rendered | Dropped (schema v2 removes it from stored collections). |
| 5 | Which voice note is the tip | `Recipe.tipsAudioId`. |
| 6 | Grocery quantities that add up | `GroceryItem.quantity` is a `Quantity`, so ranges are kept and added end to end: 1–2 + 1 = 2–3. |
| 7 | Request direction | `RecipeRequest.direction: 'incoming' \| 'outgoing'` plus `askedOf?` for outgoing (`requestedBy?` stays for incoming). Schema v2 marks existing requests incoming. |

## Gaps found while building

- `icons.ts` has no `info`, `delete` or chevron-down. Field errors use `checkThis` (a question-mark circle), destructive buttons have no icon, and the select arrow is `chevron` turned 90°.

## Cookbook and recipe detail

- **Desktop selection is `/?r=<id>`.** Rows in the list pane select a recipe into the right pane; `/r/:id` is the full-width detail page with no list pane, as in the detail mock.
- **Desktop actions include Print** (the mock shows four). Older readers may not know Ctrl+P.
- **The draft card has no Discard** ("each card has one action"). Discarding a draft belongs in the editor.
- **No results without a matching request** still offers Tell it and Ask for it, with a hint to try a shorter word.
- **Share sends a link to the recipe** (the system share sheet, or the clipboard where there isn't one). Until phase 10 it sent the recipe as text.
- **Tags aren't cookbook chips any more**; they have their own pages (`/t`, `/t/:tag`), reached from the sidebar and the recipe's tag links.

## Review changes after Phase 5

Asked for in the review of the build, so they depart from the mocks on purpose.

- **The story moves into the recipe header**, as a quote under the meta line and tags, at body-lg size in the regular (not bold) italic. It's no longer a card below the actions.
- **Example recipes get pixel-art pictures** (`src/features/library/pixelArt.ts`), stored as SVG photos. SVGs fill their box without cropping, so the drawing stays centred in any shape.
- **Collections and tags have icons**, from lucide like the rest (`src/ui/TopicIcon.tsx`). A tag's icon is guessed from its name; a collection's too, unless one is picked in Edit (stored as the optional `icon` field, which isn't indexed, so no schema version).
- **Collections and Tags are tiles** with thumbnails, followed by the recipes not yet in a collection or not tagged.
- **Cookbook list rows don't show "Made N times".**
- **The logo is a pixel-art pot** (`src/ui/logoMarks.ts`), matching the recipe pictures: `rice` beside the wordmark in light mode, `dark` in dark mode, `lid` as `public/favicon.svg`.

## Cook mode

- **Speech is the handoff's `Speech` interface** (`src/lib/speech/`), with `canSpeak`, `voices()` and `onVoicesChanged()` added, and an `onEnd` on `listen`. One listener hears at a time: a field's Speak button pauses cook-mode commands, which resume when it finishes.
- **Phone timers stack one per row**, as in the cook screenshots.
- **A timer is named after the first ingredient its step mentions** ("Rice"), and the alert's second line is the rest of that sentence ("Then drain."). With nothing after the duration, the alert has just the title.
- **Durations in the step are timer chips**, as the design system describes ("the inline chip in step text starts a timer"), though the cook screenshots draw them as plain text. Every step needs a way to start a timer by touch. The chip is sized with the step text: idle shows the words ("25 minutes"), running shows the time left (tap to pause), and a finished one shows Done (tap to stop the alarm).
- **Tapping a pinned timer pauses or resumes it** (the paused tile is in the design system).
- **The listening indicator is a button**: tapping it shows the voice commands in a small popover, so they're reachable by touch and still never on screen. It also shows `Heard "next"` for a second after a command.
- **On phones the controls stay pinned to the bottom**, so at Large and Huge the step scrolls under them. At Normal they sit where the mock has them.
- **The step is in the URL** (`?step=3`), so a reload keeps your place as well as your timers.
- **Scaled amounts move to a smaller unit below 1**: 1 kg for 4 of 6 is 670 g, 1 tbsp is 2 tsp, as in the ingredients-sheet mock.
- **The keyboard hint shows only with a mouse or trackpad** (`pointer: fine`), so touch tablets don't see it.

## New recipe and Type it

- **Tell it, Just talk and From a link open a holding page** until phase 8, saying they're coming, with a primary button to type the recipe instead (the draft switches to Type it).
- **Paste it is built now** (brought forward from phase 8) because it's the way into Check your recipe: paste, Tidy it up, then Review.
- **Check your recipe is full screen**, without the app shell, as in the Review mock.
- **An empty new draft is thrown away on Close**, and an edit draft opened and left untouched is too, so neither leaves a "Continue your draft" card behind.
- **Prep and Cook are typed as words** ("1 hr 15 min", "45") and stored as minutes; a time that can't be read is marked when you leave the field.

- **The desktop editor has a Tags pill** beside Serves, Prep and Cook, which the mock leaves out, so tags can be edited on desktop too.
- **Desktop steps have Add photo**, as on the phone, though the desktop mock draws the steps without it.

## Voice capture and imports

- **Tell it is full screen**, without the app shell, as in the mocks.
- **Short answers move on by themselves.** The name, whose recipe and servings are one phrase each, so hearing one goes to the next question. Answers so far show as cards under the mic, and Undo last (or saying "undo") goes back.
- **Every question has a Next button** (Skip while it's unanswered), so each can be finished by touch as well as by saying "next" or "done". The mocks only draw Skip and Done on the last question.
- **Ingredients are one per phrase; steps run until "next".** A pause ends an ingredient, but a step can take several breaths, so it stays open (ringed in the accent) until "next". "For the marinade" starts a section.
- **Hands-free is off at first** (tap to talk is the reliable default). It's a `role="switch"`, drawn as a small toggle inside the control.
- **The questions are spoken** when "Speak the questions" is on, and the mic pauses while they are.
- **The story is recorded while the mic listens**, so it's "Kept in your voice". The tips voice note is `tipsAudioId`, recorded with Record a voice note (which pauses the mic).
- **Everything heard is kept as "In her words"**, one phrase per line, leaving out the commands.
- **Spoken amounts count as a second amount** for "Check this" ("haldi in two tablespoons milk"), not only written ones.
- **Just talk starts listening on arrival** (choosing it is the tap) and keeps listening through pauses. The clock counts only the time spent listening, and survives leaving and coming back.
- **Just talk on desktop has no caption by the mic**, as in the mock; the clock says talking or paused, and the mic's name says what a tap does.
- **From a link sits in the app shell**, like Paste it (its desktop mock uses the same layout).
- **The import function is `/api/import?url=…`** (`functions/api/import.ts`, a Cloudflare Pages Function), or `VITE_IMPORT_URL` when it's deployed elsewhere. It only fetches public http(s) pages, reads at most 3 MB, and stores nothing. Where it isn't deployed, the app tries reading the page directly (a few sites allow it), then shows the failure state.
- **A bad web address is a field error** ("That doesn't look like a web address"), not the page failure, which is kept for pages that can't be read.
- **The recipe's picture isn't imported yet**: `imageUrl` would need fetching through the function to be kept offline.

## Safety and sharing (phase 10)

The handoff has no screens for these, so they're built from the request link page and the Sheet.

- **A recipe link opens "A recipe for you"** (`/import#recipe=…`): the request page's accent card with "From ___'s kitchen", the title, description and counts, then **Add to my cookbook**. The link carries the sender's recipe id, so opening it again shows "It's already in your cookbook" and **Open it** instead of adding a copy.
- **Recipe links are compressed with `fflate`**, which the backup already uses, instead of the plan's `lz-string`. They carry the recipe's text only: no photos, voice notes, transcript, collections or cook log, so a Tell it recipe's link stays short enough for a message. Reading one stops past 1 MB inflated.
- **A recipe told for a request carries that request's id.** The asker's copy of the request shares the id, so adding the recipe marks their outgoing request told.
- **Restore asks how** after the file is picked, in a Sheet: **Add to my cookbook** (merge, the primary) or **Replace everything** (destructive). Replace keeps this device's own settings (last backup, the storage request).
- **`storage.persist()` is asked for once on saving** (the first saved recipe or added link), as Firefox shows a prompt each time. **Each backup asks again**, as Chrome decides silently and says yes once the site is used more or installed.

## The floating tab bar (1.4.0)

- **The phone tab bar floats** instead of running edge to edge: inset 12px from the sides, lifted just above the home indicator (`max(12px, safe-area − 4px)` from the bottom), rounded to the skin's `--radius-xl`, on frosted `--surface` with a hairline and `--shadow-lift`. A bar glued to the bottom sat awkwardly on the iPhone home indicator in the installed app; floating clears it the way iOS's own apps do, and the page scrolls softly underneath.
- **The current tab's icon sits on a small `--accent-soft` pill**, only as wide as the icon, which opens out from the middle when the tab is chosen (the settle move in [`MOTION.md`](MOTION.md)). A highlight the width of the whole column crowded the labels. The handoff's bold label and heavier icon stay.
- **The bar keeps its size at Large and Huge**: the labels are already capped at 15px and the icons are 24px, so the disc, the pill and the row height are capped too rather than squeezing five columns.
- The five columns, labels, 56px+ targets and the New disc are as the handoff has them.
