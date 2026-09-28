# Handoff: Bookcook — a cookbook you can talk to

## Overview
Bookcook is a calm, ad-free cookbook for recipes that only live in someone's head. People **say** a recipe out loud (a guided interview, or free talk) or **type** it naturally, and the app turns it into a structured recipe they can cook from hands-free. The primary user is 55–75, cooks from memory, wears reading glasses and has busy hands. So voice, very large text and big targets matter more than density.

The package covers every screen in the brief. Each is shown on phone and desktop, in all five visual skins, light and dark, at three text sizes.

## About the design files
The files in `design/` are **design references built in HTML**. They are prototypes that show the intended look and behaviour. They are **not production code**. Rebuild them in the target stack below, using its patterns. Open any `design/*.dc.html` in a browser. The bar at the top switches skin, mode, accent, text size, ingredient colours and step photo, and the setting carries across pages.

## Fidelity
**High fidelity.** Colours, type, spacing, radii, states and copy are final. Reproduce them exactly from `src/design/tokens.css`. The screenshots are DOM re-renders, so some show a text line wrapping a little early. The HTML is the source of truth.

## Target stack (confirmed)
- Vite 8, React 19, TypeScript strict, react-router 8.
- Dexie 4 + dexie-react-hooks (IndexedDB) for all data. MiniSearch for recipe search.
- Web Speech API behind a `Speech` interface. A Capacitor Android implementation comes later.
- Tailwind v4, with tokens mapped through `@theme inline` (`src/design/theme.css`). React Aria Components for every interactive control.
- Fonts are self-hosted via @fontsource (see `theme.css`; check the package names at install). Icons come from **lucide-react** (`src/design/icons.ts`, see "Icons" below).
- **Design values live only in `src/design/`. Component styling lives in `src/ui/`.** Screens (`src/features/*`) compose `src/ui` components and never hard-code colours or sizes.

Suggested layout:
```
src/design/   tokens.css  theme.css  skin.ts  icons.ts       ← drop-in from this package
src/ui/       Button, TextField, BigMicButton, SmartIngredientLine, StepRow, TimerChip, PinnedTimer,
              TimerAlert, CookControls, ListeningIndicator, Mention, RecipeCard, DraftCard, RequestCard,
              Chip, Segmented, ServingsStepper, ChecklistItem, Sheet, UndoToast, SavedIndicator,
              VoiceNotePlayer, StoryQuote, EmptyState, TabBar, Sidebar, Switch
src/features/ capture/ editor/ cook/ library/ grocery/ requests/ settings/ print/
src/data/     db.ts (Dexie), search.ts (MiniSearch), parse/ (existing)
src/speech/   Speech.ts (interface), web.ts (Web Speech impl)
```

## Files in this package
| Path | What it is |
|---|---|
| `src/design/tokens.css` | **Source of truth.** Every colour, type, space, radius, shadow and motion token, for all skins, modes, accents and text sizes. Section 9 names are kept exactly. |
| `src/design/theme.css` | The CSS entry: Tailwind, fonts, tokens, the `@theme inline` colour and font mapping, base reset. |
| `src/design/skin.ts` | Six layout differences between skins that tokens can't express, plus `applyAppearance()` and `spiceGroups()`. |
| `src/design/icons.ts` | The Material Symbols → lucide mapping. |
| `docs/components.md` | Props, states and notes for every component. |
| `docs/themes.md` | Skins, contrast audit, accessibility, voice and copy rules. |
| `docs/screen-map.md` | Routes → backend types, plus backend suggestions. |
| `ACCEPTANCE.md` | The checklist every screen must pass. |
| `design/Bookcook Design System.dc.html` | Live token and component reference (all states). |
| `design/Bookcook Capture.dc.html` | New recipe chooser, Tell it (8 states), Just talk. |
| `design/Bookcook Editor.dc.html` | Type it / Edit (5 states), Paste it, From a link, Review. |
| `design/Bookcook Cook.dc.html` | Recipe detail, cook mode (8 states), I made it, tablet, desktop. |
| `design/Bookcook Home.dc.html` | Cookbook (with empty and no-results states), Grocery, Requests, Settings. |
| `design/Bookcook Print.dc.html` | Printed family cookbook: cover, contents, recipe page, story page. |
| `screenshots/<area>/<skin>_<frame>.jpg` | 64 reference captures. Skins are 1-quiet, 2-heirloom, 3a-spice-tin, 3b-colour-coded, 3c-colour-field. There are dark cook frames (`*-DARK`) and a Huge text frame (`*-HUGE`). |

---

## Theming model
All switches are attributes on `<html>`, written by `applyAppearance()` in `skin.ts` from the Settings table:

| Attribute | Values | Setting key |
|---|---|---|
| `data-skin` | quiet · heirloom · spice-tin · colour-coded · colour-field | `skin` |
| `data-theme` | light · dark (resolve `system` with matchMedia) | `theme` |
| `data-accent` | tomato · saffron (colour-field is fixed tomato) | `accent` |
| `data-text-size` | normal · large (×1.2) · huge (×1.45). This scales the root rem: 1rem = 18px × scale. | `textSize` |
| `data-spice` | on · off (ingredient colours; any skin. Defaults on for colour-coded) | `spiceColours` |

Two local switches: `data-surface="field"` goes on the cook-mode root (and the detail header band) in colour-field, and `data-spice-group="1..4"` goes on an ingredient section heading, a step mention or a timer.

**Rules**
- Size everything in rem so Large and Huge reflow, never shrink or clip. Frames use `min(var(--text-sm), 15px)` only for tab labels.
- Borders are drawn as inset box-shadows, so they don't change the layout.
- Text fields cap their radius at `min(var(--radius-md), 18px)`, because the Tin skins set radius-md to 999px.
- Use `--accent-mark` for non-text marks (progress bars, pulses, rings, stars) and `--accent-text` for accent-coloured text. They differ in saffron.
- Muted text (`--ink-muted`) is never the only way to learn what to do.

### Key values (quiet skin, light, tomato; all others are in tokens.css)
paper `#FBF7F0` · surface `#FFFFFF` · sunk `#F3ECE1` · ink `#1F1B16` · ink-muted `#574E45` · line `#E6DDD0` · line-strong `#C9BBA9` · line-control `#8F8172` · accent `#B63E26` · accent-strong `#9A3320` · accent-soft `#F7DCD2` · accent-ink `#FFFFFF` · accent-text `#93321D` · success `#2F5E2A` · danger `#9B2C1F`.

Type scale (1rem = 18px at Normal): sm 14 · base 18 · lg 22 · xl 28 · 2xl 36 · 3xl 48 · 4xl 64. Cook step text uses `--step-size`: 42px in quiet, 40px in heirloom at weight 560, 38px in tin, 42px in field. The tablet and desktop step is `--text-4xl` (64px).

Fonts: display is Fraunces (Heirloom uses EB Garamond). Body is Atkinson Hyperlegible Next. Weights and axis settings come from the tokens: `--font-display-weight`, `--font-display-settings`, `--step-weight`, `--step-settings`, `--heading-*`.

Spacing is a 4px grid. Targets are **56px minimum** (3.1111rem): L buttons 56, XL buttons 64 (3.5556rem), cook controls 76 (4.2222rem), tab items 64, and the mic 120 (6.6667rem).

Radius (quiet): sm 8, md 16, lg 18, xl 28. Heirloom: 3, 12, 12, 16. Tin family: 12, 999, 28, 32.

Shadows: `--shadow-paper` (cards) and `--shadow-lift` (sheets, toasts, popovers). Both are warm and built from `--shadow-color`. Heirloom uses an inset "pressed paper" shadow instead.

---

## App shell
- **Phone (under 900px):** the bottom **TabBar** has 5 equal columns: Cookbook · Grocery · New · Requests · Settings. Padding is 8/4/14px, each item is at least 64px tall, and every item has a label. **New** is a 52px disc (`--tab-new-bg`) that stays inside its own column and never overlaps its neighbours. The current tab uses a heavier icon and bold ink; the others are muted.
- **Desktop (900px and up):** the **Sidebar** is 252px wide, `--sunk`, with 20px/14px padding. It holds a wordmark, the **New recipe** primary button, then Cookbook, Collections, Tags, Grocery, Requests and Settings (56px rows, radius-sm). The current row is `--surface` with `--shadow-paper`. The footer says "Press ? for shortcuts".
- **Cookbook desktop** has three panes: the sidebar (252), a list (380, searchable, with a right border) and the selected recipe in the rest.
- **Tablet landscape** uses the desktop shell. Cook mode is always full-screen, with no shell.
- **"?"** opens the Keyboard shortcuts sheet: N new recipe · / search · C start cooking · E edit · ← → steps · Ctrl+S save.

---

## Screens
Routes and data are in `docs/screen-map.md`. Every screen has **one** primary button (`--accent`). Copy is final. Use it verbatim.

### 1. New recipe chooser — `/new` (Capture page)
- **Phone:** a bottom Sheet (radius-xl top, a 44×5 grabber, "New recipe" title, and a Close button with its label). There are four equal choice buttons, each at least 100px tall: a 60px `--accent-soft` icon disc, then the title in display xl and one line in ink-muted.
  - Tell it: "Answer a few questions out loud. We'll write it down."
  - Type it: "Type it the way you'd say it."
  - Paste it: "From WhatsApp, notes or email."
  - From a link: "Import from a recipe website."

  Below the four sits the quiet link **"Or just talk freely"** (muted, underlined).
- **Desktop:** a centred 680px dialog with the choices in a 2×2 grid.
- **Speech unsupported:** the Tell it card becomes a dashed, non-interactive box ("This browser can't hear you. Try Chrome or Edge."), and the Just talk link is hidden.
- Picking a choice creates a `Draft {mode}` and routes to that flow.

### 2. ★ Tell it — `/new/tell/:draftId`
One question at a time.
- **Top row:** a quiet **Exit** button on the left (the draft is saved). On the right, the progress label "Ingredients · step 4 of 7" (bold, no wrapping) above a 132px progress bar in `--accent-mark`.
- **Question:** display 2xl (36px), balanced. The helper line below it is ink-muted: "Say "next" after each one, "done" when you're finished."
- **BigMicButton** (120px), with the label below it: idle "Tap to talk", listening "Listening…" (breathing), processing "Writing it down" (spinner ring). One tap toggles it, and it has `aria-pressed`.
- **Live transcript:** lg, ink-muted, centred, `aria-live="polite"`.
- **Parsed rows card** (surface, shadow-paper): the section label, then a grid of `5rem` quantity (bold) and name. The newest row gets `--accent-soft` for 1.2s. Unsure rows get a "Check this" pill.
- **Controls** (3 equal buttons, 76px tall, icon above label): **Hands-free** (a switch, `role="switch"`) · **Undo last** · **Type instead**.
- **States shown:** listening · processing · idle with an unsure row · mic denied · speech unsupported · the steps question · the tips question · the story prompt.
  - **Mic denied:** a dashed mic_off disc, "The mic is blocked", 3 numbered steps in a card, then **Try again** (primary) and **Type instead**.
  - **Unsupported:** a keyboard disc, "This browser can't hear you", then **Type it** (primary).
  - **Steps question:** each spoken step becomes a card with its numeral in accent-text. A spoken duration becomes an inline **TimerChip** ("30 min"). The newest card has a 2px `--accent-mark` ring.
  - **Tips question:** tip cards, then a secondary **Record a voice note** button.
  - **Story prompt:** "Who taught you this?" The answer shows as a StoryQuote with "Kept in your voice · 0:21". The final step swaps the controls for **Skip** (1fr) and **Done** (1.5fr, primary).
- **Desktop:** a top bar (Exit · centred 7-segment progress · "Draft saved"), then 2 columns: the question, mic and controls on the left, the parsed rows card on the right. The hint "Space to talk · Esc to exit" sits in the controls row.

### 3. Just talk — `/new/talk/:draftId`
It reuses the Tell it parts. The top row has Exit and the elapsed time ("4:12 talking", display xl, tabular). The title is "Just talk.", with "Cook and tell it as you go. We'll sort it out, then you check it." The mic reads "Listening… tap to pause", or "Paused · tap to carry on" when paused. The "What we heard" card shows the transcript in `--font-handwritten`, with the partial words muted. A full-width **Done** goes to Review.

### 4. ★ Type it / Edit — `/new/type/:draftId`, `/r/:id/edit`
- **Phone:** the header has Close and a "Draft saved" SavedIndicator. Below it, a pill tab row with 4 numbered sections: 1 Details · 2 Ingredients · 3 Steps · 4 Story. Only one section shows at a time. A sticky **Save recipe** bar (XL primary, full width, with a top hairline) sits at the bottom.
  - **Details:** the hero photo (16:10, radius-lg) with a "Change" button on it. Then Recipe name (a display-xl value), **Whose recipe?** shown as "From **Mom**'s kitchen" with only the name editable, a Serves stepper ("6 people"), and Prep / Cook side by side. **Every text field has a Speak button** inside it: 56px wide, the mic icon above a 12px bold "Speak".
  - **Ingredients:** one SmartIngredientLine per row. A line ending in ":" becomes a SectionHeading (display bold lg, with a spice dot and hairline when spice is on). The focused line shows the parse preview underneath: **3** · **cups** · basmati rice · *washed and soaked*. The autocomplete dropdown hangs off the focused field (a React Aria ComboBox, 56px options, the selected one in `--accent-soft`). The row actions are **Line**, **Section** and **Speak**.
  - **Deleting a line** shows an UndoToast above the save bar: "“1 tsp turmeric” deleted" · Undo. It lasts 6s and pauses on hover or focus.
  - **Steps:** each StepRow has a **Move** handle (drag, and it also opens Up and Down), the numeral in accent-text display xl, the text with ingredient Mentions and inline timer chips detected live, and **Add photo** (or a thumbnail plus "Step photo added"). Below the list is **+ Step**.
  - **Story:** "Who taught you this?" (a multiline italic display field with Speak), a VoiceNotePlayer ("Play · 0:21"), Tips, and **Record a voice note**.
- **Desktop:** the sidebar, then a top bar ("New recipe · Type it", "Draft saved", **Save recipe**). Below that: a 200px photo with the title field and 4 meta pills, then **Ingredients (0.9fr) and Steps (1.1fr) side by side**. The footer hint reads "Enter for next line · Ctrl+S to save · End a line with ":" for a section".

### 5. Paste it · From a link — `/new/paste/:draftId`, `/new/link/:draftId`
- **Paste it:** Back, the title, and the helper "Messy is fine. We'll sort the ingredients from the steps." Then a large textarea labelled "Your recipe" (placeholder "Paste a recipe from WhatsApp, notes or email"), a secondary **Paste** button while it's empty, and a bottom **Tidy it up** button (disabled while empty). While tidying: a spinner around the wand icon, "Tidying it up…", "Sorting ingredients from steps. You'll check it next.", and skeleton lines. Then it goes to Review.
- **From a link:** a "Web address" field and **Get recipe**. Loading shows a card with a spinner, "Reading the page…" and image and text skeletons. On failure, a `--danger-soft` card with `role="alert"`: "We couldn't read that page" / "Some sites hide their recipes. Copy the recipe text and try Paste it instead." It has an inline **Paste it** button, and the bottom button becomes **Try again**.
- **Desktop:** the same content in a max-width 860px column, beside the sidebar. The hint "Ctrl+Enter" sits next to the primary button.

### 6. Review — `/new/review/:draftId`
"Check your recipe", with "Tap anything to fix it. **2 things** to check." Below come editable cards: **Details**, **Ingredients** (grouped by section), **Steps** and **Tips** (Story too, on desktop). An unsure row is a full-width button tinted `--accent-soft`, with "Check this · heard “haldi”" (or "two amounts in one line") in accent-text bold 15px. Tapping any row edits it in place. **Save recipe** writes the Recipe and deletes the Draft. Desktop shows 3 columns: Details, Tips and Story (0.8fr) · Ingredients (1fr) · Steps (1.2fr).

### 7. Recipe detail — `/r/:id` (Cook page)
- **Phone, bleed hero:** a 300px photo with a floating **Back**. Then the title (display 3xl), the eyebrow "From Mom's kitchen" (display italic lg, accent-text), "Serves 6 · Prep 30 min · Cook 1 hr 15 min", and tag links. After that come **Start cooking** (XL, full width), then the secondary actions (layout from `skinConfig.actions`): Edit · Make my version · Add to grocery · Share · Print.
- The **story** card (the prompt label, a display italic xl quote, "Play · 0:48").
- **Ingredients:** the ServingsStepper and a Metric/Imperial Segmented control, grouped sections, and **Add to grocery**.
- **Steps**, numbered, at lg size.
- **Tips.** **In her words** is a collapsible panel on `--sunk` showing the transcript in the handwritten face. Then the **Original card** photo.
- **Made 12 times:** the CookLog rows (date, "4 of 5" with a star, and the note).
- Headings follow `--heading-*`. Heirloom centres them in small caps, with a rule.
- **fieldBand hero (3c):** the title block sits on the accent field (`data-surface="field"`), centred, with the photo below it with rounded bottom corners.
- **No photo / forked:** no hero. A "Based on **Mom's Pasta**" link row (`--sunk`, with the fork icon) sits above Start cooking.
- **Desktop:** the title block (display 4xl, 64px) and actions on the left, a 420px photo on the right. Below them, Ingredients (0.85fr) sits beside the story card and Steps (1.15fr).

### 8. ★ Cook mode — `/r/:id/cook`
Full-screen, readable from 1–2 metres. The root has `data-surface="field"` in 3c.
- **Top:** Close · **Ingredients** (opens the sheet).
- **Header, bar style:** "Step 3 of 5" (display bold lg), and on the right the ListeningIndicator: a 14px breathing dot plus one word (Listening / Reading / Mic off). Below that, a 5-segment progress bar: done segments in ink, the current one in accent-mark, the rest in line. **Numeral style (spice-tin):** a 104px numeral in accent-text, with "of 5" and dots beside it.
- **Pinned timers:** a grid of `auto-fit, minmax(min(100%, 9.5rem), 1fr)` with a 10px gap. Each tile is at least 76px tall, with a ring box `--timer-ring`, a conic progress fill, the label in bold (spice colour when on) and the time in display bold xl, tabular. **Hot** (under 60s) uses `--timer-hot-bg`/`fg` and the alarm icon. The aria-label reads like "Rice timer, 42 seconds left, almost done".
- **Step text:** `--font-display`, `--step-size`, `--step-weight`, `--step-settings`, line-height 1.13, `text-wrap: pretty`. Ingredient names in the text are **Mentions** (`role="button"`). Tapping one shows a popover below it: an ink chip with "1 kg chicken, bone-in" (the scaled amount). It closes on the next tap, on Esc, or after 4s.
- **Step photo** (optional setting): an 84×64 thumbnail with "It should look like this".
- **Controls:** a grid of `1fr 1fr 1.5fr`, 8px gap, 76px tall. **Back** · **Read** (becomes **Stop** with `aria-pressed` while speaking) · **Next** (primary; on the last step it becomes **I made it** with the celebration icon). `flex-direction: var(--cook-btn-direction)` puts the icon above the label in the quiet skins, and beside it in the Tin skins.
- **TimerAlert** (a timer finished): a full-width accent card with `role="alert"`, "Rice is done" / "Drain it now.", then **+1 min** (outlined) and **Stop** (inverted). It repeats a soft chime and speaks until stopped, and saying "stop" also stops it.
- **Ingredients sheet:** a bottom sheet over a 45% scrim. It holds a ServingsStepper (showing 4 in the mock, so amounts are scaled), Metric/Imperial, section headings, and ChecklistItems (a 30px box, the whole row is the target, checking pops the box, the quantity is bold). Checked items are struck through and muted.
- **I made it sheet:** "I made it", "That's 13 times now.", "How did it turn out?" with 5 stars (a radiogroup, 56px targets), "Note for next time" (with Speak), then **Photo** and **Save**. It writes a CookLog and increments `cookedCount`.
- **Mic blocked:** the indicator shows "Mic off". Every button still works.
- **Tablet landscape (1180×820):** the ingredients checklist is pinned left (340px, `--sunk`, with a stepper). The right side has the header row, timers in a row, the step at 64px, and the controls (max 760px).
- **Desktop (1280×800):** the same as tablet, with a 320px aside, the step measure capped at 860px, and the hint "← and → to move · Space to read · T for timers".
- **Voice commands:** next · back · repeat · timer · stop. They appear only in the indicator's tooltip and in Settings, never on screen.

### 9. Cookbook (home) — `/`
- **Phone:** "Good evening" (display 3xl), then a search field with a Speak button, and collection chips in a horizontally scrolling row (All · Mom's classics · Eid · Quick weeknights; nowrap, 56px, selected = ink). Below them:
  - **DraftCard** (`--sunk`): "Continue your draft" / **Chicken Karahi** / "Started 2 days ago" / an ink **Continue** button.
  - **RequestCard** (`--accent-soft`): "*Sam* would love to learn" / **Nihari** / **Tell it**.
  - "All recipes · 5" with a **Recent** sort button, then **2-column** RecipeCards: a 4:3 photo (or a striped placeholder), the title in display lg, "Mom · 1 hr 45 min", and "Made 12 times" or "Based on Mom's Pasta".

  The whole card is one link.
- **Empty:** the eyebrow "Your cookbook is empty", "Every family has a recipe worth keeping.", a helper line, and **Let's save your first recipe**.
- **Search, no results:** "No “nihari” here yet". Because an open request matches, it says "Sam already asked for it…" with **Tell it** and **Ask for it**.
- **Desktop:** the three panes. The list pane has the greeting, a search field ("/" hint), wrapping chips, a combined request-and-draft card, and 64px-thumbnail rows. The selected row is surface with a shadow. The detail pane shows the recipe.

### 10. Grocery — `/grocery`
"Grocery", with "7 to buy · 4 in the basket" and **Clear checked**. Then an "Add an item" field (with Speak) and **Add** (primary). Items are grouped by aisle (Produce, Meat, Dairy, Spices, Rice and grains). Each is a ChecklistItem: the name in bold, "From Biryani, Karahi" in muted 16px. Checked items stay in place until **Clear checked**, which shows an UndoToast: "4 items cleared". Empty state: "Nothing to buy" / "Tap Add to grocery on any recipe, or add things here yourself." Desktop lays the aisles out in an `auto-fill, minmax(230px, 1fr)` grid.

### 11. Requests — `/requests`
"Requests" / "Ask for a recipe that only lives in someone's head. They answer by telling it." / **Send request** (primary; opens the share sheet with a link).
- **Waiting to be told:** RequestCards showing who asked and when, the title (display xl) and the note in quotes, with **Tell it now** (ink; creates a `Draft {requestId}`). If a draft exists, it shows "Draft started 2 days ago" and **Continue** instead.
- **Told:** a `--success-soft` card with a celebration disc: "**Grandma's Banana Bread** · Nani told it. It's in your cookbook."
- **Empty:** "No requests yet" / "Which dish do you wish you could make like they do?"
- Desktop shows a 3-column card grid.

### 12. Settings — `/settings`
In order:
- **Backup nudge** (`--accent-soft`, `role="status"`): "Last backup: 34 days ago" / "Save a copy so your recipes are safe if this phone is lost." / **Back up now** · Restore.
- **Text size:** a Segmented control whose labels are drawn at their real sizes (18, 21, 25px). A live preview card below it shows a cook step in step type, and changing the size re-renders the whole app immediately.
- **Look:** Light / Dark / System, a Style row (skin name), an Accent row ("Tomato (fixed)" in 3c), and switches for Ingredient colours and Step photos.
- **About you:** Your name, Default author, Cookbook title.
- **Voice:** Read steps aloud, Speak the questions, Speech speed (Slower / Normal / Faster), Voice, and Voice commands.
- Keyboard shortcuts · Print the family cookbook.

Switches are 52×32 and each whole row is the target. Desktop uses 2 columns, and the "?" shortcuts sheet appears bottom-right over a scrim.

### 13. Print — `/print`
Letter pages that also fit A4. **Always black on white**, whatever the mode or accent. Only the display face follows the skin. Use print CSS (`@page`, `break-before: page`).
- **Cover:** "A FAMILY COOKBOOK" (tracked caps), "Mom's Kitchen" (display 88px) with the subtitle, an optional greyscale photo, and the year.
- **Contents:** the recipe title (display 28px), author and note, and the page number.
- **Recipe page:** the title block with a small photo, a 2px rule, then a 250px ingredients column beside the steps, and a boxed Tip.
- **Story page:** the prompt, the quote in display italic 48px, and "In her words" in the handwritten face.

---

## Interactions and motion
Motion is calm and short: `--dur` 200ms with `--ease-out`.
- The mic and the listening dot use `--animate-breathe` (2.4s: scale 1.08 plus a soft ring).
- Sheets and toasts use `--animate-rise`. Check-offs use `--animate-pop` (260ms).
- Cook steps slide 24px with a 200ms cross-fade.
- The parse preview fades in 150ms, after 300ms without typing.
- The newest Tell it row is tinted for 1.2s.
- **Reduced motion** keeps every state change and drops travel and breathing (handled in tokens).

Other rules:
- **No hidden gestures.** Every drag has a Move button, and swipe-to-delete doesn't exist.
- **No confirm dialogs.** Destructive actions happen immediately and show an UndoToast.
- **Focus:** a 3px `--focus` outline, offset 3px, always visible from the keyboard. Sheets trap focus and always have a visible Close.

## State management
- **Dexie tables:** `recipes`, `drafts`, `cookLogs`, `groceryItems`, `requests`, `collections`, `media`, `settings`. Read them with `useLiveQuery`.
- **Drafts** auto-save on every change (debounce about 500ms), and "Draft saved" reflects that.
- **Search:** a MiniSearch index over title, author, tags and ingredient names, rebuilt from a live query of recipes. Use prefix plus fuzzy 0.2.
- **Appearance:** `settings` → `applyAppearance()` in one effect at the root, plus a `prefers-color-scheme` listener for System.
- **Cook mode (client state):** the current step, reading, the listening state, and timers `{id, label, stepIndex, endsAt, pausedRemaining?}` driven by a single `requestAnimationFrame` or 1s tick. Mirror the timers to localStorage so a reload doesn't lose them (backend suggestion 2).
- **Speech:**
  ```ts
  interface Speech {
    supported: boolean;
    listen(opts: { continuous: boolean; lang: string; onPartial(t: string): void; onFinal(t: string): void; onError(e: 'denied' | 'unsupported' | 'network'): void }): { stop(): void };
    speak(text: string, opts: { rate: number; voice?: string }): Promise<void>;
    cancel(): void;
  }
  ```
  Commands are matched on final results only: next, back, repeat, timer, stop, done, undo.
- **Derived in the UI:**
  - Spice group: `spiceGroups()` in skin.ts.
  - Mentions: ingredient names matched in `Step.text`, case-insensitive, longest match first.
  - Timer chips: `Step.timerSeconds`, plus durations parsed from the text.

## Icons
The mocks use **Material Symbols Rounded**, but the stack uses **lucide-react**. `src/design/icons.ts` maps every icon in the mocks to a lucide equivalent. Lucide is line-only, so the mocks' "filled = current" state becomes strokeWidth 2.5. Fill with currentColor only for Star, Play/Pause and the record dot. Every icon has a visible text label next to it, so icons are `aria-hidden`.

## Assets
- `design/assets/biryani.jpg` is a stock photo with a watermark, for mocks only. Real photos come from `Media`.
- The striped boxes are placeholders for user photos (step photo, original card, recipe cards without a photo).
- There are no illustrations or custom drawings. The empty states are typographic.

## Backend suggestions (the engineer decides)
These came up while designing. None blocks v1.
1. **"Check this" on Review:** `ParsedIngredient` / `ParsedStep` have no confidence field. Add `needsCheck?: boolean` (or `confidence?: number`), otherwise Review can't mark unsure rows.
2. **Reason for checking:** the Review mock shows why a row is flagged. Add `checkReason?: string` next to it, or drop the reason.
3. **Running timers** aren't persisted. Use localStorage (as above) or a `Setting` key `activeTimers`.
4. **Collection.emoji** is not rendered anywhere. Drop it, or leave it unused.
5. **Tips voice note:** `voiceNoteIds` doesn't say which note is the tip and which is the story. Add `tipsAudioId?` on Recipe, or `Media.role`.
6. **Grocery merge:** "3 onions · from Biryani, Karahi" needs quantities that add up. `Ingredient.quantity` can be a range, but `GroceryItem.quantity` is a number. Pick a rule (the upper bound, or store the range).
7. **Request direction:** Requests shows both "someone wants this from you" and "you asked someone". Add `direction: 'incoming' | 'outgoing'` or `askedOf?: string`.

## Suggested build order
1. `src/design` drop-in, the appearance provider, base `src/ui` controls (Button, TextField + Speak, Segmented, Switch, Sheet, UndoToast), and the shell (TabBar, Sidebar, routes).
2. Dexie schema, sample data (brief section 8), Cookbook, Recipe detail.
3. Cook mode (timers, mentions, speech, the sheets). Test it at Huge and in dark mode before moving on.
4. Type it / Edit with SmartIngredientLine, then Review.
5. Tell it and Just talk (the Speech interface), then Paste it and From a link.
6. Grocery, Requests, Settings, then Print.

Each screen is done when it passes `ACCEPTANCE.md`.
