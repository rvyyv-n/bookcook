# Onboarding and motion

The design handoff has no screens for first-run onboarding and only a few lines on motion (README, "Interactions and motion"). This spec fills both gaps for phase 12.

It adds to the handoff and changes none of it:
- The skins, tokens and existing layouts stay as they are.
- New parts are built from existing `src/ui` components and existing tokens.
- Every screen here must pass [`ACCEPTANCE.md`](ACCEPTANCE.md) like any other.

---

## Part 1: First-run onboarding

### Goals

- Set the text size before anything else. The users are 55–75 and many wear reading glasses, so a comfortable size matters more than any explanation.
- Say what voice does in one screen, without listing the cook-mode commands. [`themes.md`](themes.md) keeps those to the tooltip and Settings.
- Ask for the microphone at a moment the user understands, not in the middle of a recipe.
- End in the existing empty cookbook, which already offers **Let’s save your first recipe** and **Try an example**. Onboarding doesn’t duplicate them.
- Stay short: three steps, and every step can be skipped.

### Who sees it

It shows once, the first time the app opens at `/`:

| State | What happens |
|---|---|
| The `onboarded` setting is false (it already exists in `src/db/settings.ts`, currently unused), and there are no recipes and no drafts | Replace-navigate to `/welcome` |
| `onboarded` is false, but recipes or drafts exist (someone already using the app before this ships, or after a restore) | Set `onboarded` to true silently and show nothing |
| The first visit is a deep link (`/import#…`, `/r/:id`, `/new…`) | Never intercept it. The gate runs only on `/` |
| Finishing, skipping, or restoring a backup from step 1 | Set `onboarded` to true |

- **Where the check runs:** the check is a pure function, `shouldOnboard(settings, recipeCount, draftCount)`. It is unit tested and runs in the cookbook route.
- **No flash:** the cookbook renders nothing until settings and counts have loaded. This is the same as today’s loading state.

### Route and structure

- **Route:** `/welcome` is full-screen with no app shell, like Tell it and cook mode. The step is in the URL: `/welcome`, `/welcome?step=voice`, `/welcome?step=mic`.
  - The browser and Android Back buttons go to the previous step.
  - Reloading keeps the user on the same step.
- **Re-opening:** Settings gets a new row, **Show the welcome again** (icon `cookbook`), in the list with Print the family cookbook.
  - It opens `/welcome?from=settings`.
  - Skip and the final button go back to `/settings` instead of `/`.
  - `onboarded` is left as it is.

**Top bar (all steps):**

| Left | Centre | Right |
|---|---|---|
| **Back** (quiet, `back`), on steps 2 and 3 only | Progress (see Skins) | **Skip** (quiet), on steps 1 and 2 only. Step 3 has its own **Not now** |

- **Keyboard:** Esc skips. On desktop, the hint “Esc to skip” sits beside the primary button.
- **Focus:** on every step change, focus moves to the step’s `<h1>` (`tabIndex={-1}`), so screen readers announce the new step.

### Step 1: Welcome

| Part | Content |
|---|---|
| Mark | The logo tile (`Logo`), 4.4444rem (80px) at Normal |
| Eyebrow | `welcomeEyebrow` (type-eyebrow, accent-text) |
| Title | `welcomeTitle` (display 3xl) |
| Body | `welcomeBody` (lg, ink) |
| Text size | Label `textSizeLabel`, the same Segmented control as Settings (labels drawn at their real sizes), hint `textSizeHint`. Changing it re-renders the app immediately, like Settings |
| Quiet link | `restore` → the existing restore flow from `Backup.tsx` (file picker, then the Restore this backup? sheet). On success, go to `/` |
| Primary | **Next** |

- **Restoring from step 1:** someone reinstalling on a new phone can restore straight away, which is when they need it most.
- **Text size:** it sits on the first screen because every later screen should already be readable.

### Step 2: Voice

| Part | Content |
|---|---|
| Title | `voiceTitle` (display 2xl) |
| Three rows | Each row is a 3.3333rem (60px) icon disc, a bold lg title and one ink-muted line. The icons are `mic`, `startCooking` and `keyboard`, all existing names in `icons.ts` |
| | `voiceTell` / `voiceTellBody` |
| | `voiceCook` / `voiceCookBody` |
| | `voiceType` / `voiceTypeBody` |
| Secondary | **Hear it** (`read`): reads `settings.textPreview` with the user’s speech rate and voice. It turns into **Stop** with `aria-pressed` while speaking, like Read. It is hidden when `speech.canSpeak` is false |
| Primary | **Next** |

- **Rows are not buttons.** They explain; they don’t navigate.
- **Icons:** only names already in `icons.ts` are used, since that file stays byte-identical.
- **Layout:** the rows sit in a grid of `repeat(auto-fit, minmax(min(100%, 15rem), 1fr))`. On desktop at Normal they are three across. They stack on a phone and at Huge.
- **Hear it:** it lets someone hear the voice before they rely on it. It also confirms that speech output works on the device.

### Step 3: Microphone

A new platform helper, `src/lib/platform/micPermission.ts`, provides two functions:

- **`micState()`** returns `'granted' | 'prompt' | 'denied' | 'unsupported'`.
  - `'unsupported'` when `speech.supported` is false.
  - On the web, it uses `navigator.permissions.query({ name: 'microphone' })`. Where that isn’t available (Firefox), the answer is `'prompt'`.
  - On native, it uses the speech plugin’s `checkPermissions()`.
- **`requestMic()`** returns the resulting state.
  - On the web, it calls `getUserMedia({ audio: true })` and stops the tracks at once.
  - On native, it calls the plugin’s `requestPermissions()`, which `nativeListen.ts` already uses.

The step opens in the state `micState()` returns. So someone who has already allowed the mic sees the granted state, and isn’t asked again.

| State | Disc | Title / body | Buttons |
|---|---|---|---|
| **Ask** (`prompt`) | `mic`, accent-soft | `micTitle` / `micBody` | Primary **Allow the microphone** (`allowMic`) · quiet **Not now** (`notNow`) |
| **Granted** | `check`, success-soft, which pops once | `micGranted` / `micGrantedBody` | Primary **Open my cookbook** (`finish`) |
| **Denied** | `micOff` on a dashed ring (as in Tell it) | `capture.blocked` / `micDeniedBody`, then the numbered steps card (`capture.blockedSteps` on the web, `blockedStepsNative` in the APK) | Secondary **Try again** (`capture.tryAgain`) · primary **Open my cookbook** |
| **Unsupported** | `keyboard` | `capture.noSpeechTitle` / `micUnsupportedBody` | Primary **Open my cookbook** |

- **Not now** finishes onboarding without asking. The mic is then requested the first time someone taps a mic button, as it is today.
- **Announcing the result:** the state change goes into a `role="status"` region, so a screen reader hears the result after the system dialog closes.
- **Privacy copy:** `micBody` doesn’t promise that speech stays on the device. Chrome’s recogniser sends audio to a server. The copy says only when Bookcook listens.
- **Try again:** the web can’t re-show a dismissed prompt. So Try again re-runs `micState()`, which picks up a change the user made in site settings.

### Landing

- Finishing or skipping replace-navigates to `/`, the existing empty cookbook, with its **Let’s save your first recipe** and **Try an example**.
- Focus goes to the empty state’s heading.
- Nothing else changes on that screen.

### Layout

**Phone (390px):**
- **Top bar:** 56px targets, 16px side gutters.
- **Content:** scrolls in a column with 20px gutters. The content starts a third of the way down when it fits, and from the top when it doesn’t (Large, Huge).
- **Primary button:** an XL (64px) full-width primary sits in a sticky bottom bar with a top hairline and the safe-area inset, like the editor’s save bar.
- **Secondary actions** (Hear it, Try again, Not now, restore) sit in the content, above the bar.

**Desktop (1280px):**
- **Top bar:** full-screen with no sidebar. The logo and wordmark are on the left, the progress is centred, and Skip is on the right.
- **Content:** a centred column, `max-width: 40rem` (step 2 uses `64rem` for its three rows), vertically centred in the viewport.
- **Primary button:** inline, left-aligned under the content, with the “Esc to skip” hint beside it.

**Text size:** everything is in rem, and nothing is clipped at Huge. The Segmented control is the same component that already passes at Huge in Settings.

### Skins

Every difference below comes from existing tokens or `skinConfig`. No new skin configuration is needed.

| Skin | Progress | Alignment | Surface | Notes |
|---|---|---|---|---|
| Quiet | `StepBar` (3 segments), with a “Step 1 of 3” label above it | Start | Paper | The baseline |
| Heirloom | `StepBar` | Centred (`detailAlign`) | Paper | Headings follow the heading tokens (small caps, rule). The discs use `--radius` tokens, so they read as pressed paper |
| Spice tin | `StepNumeral` (a big numeral, “of 3”, dots), as in cook mode (`stepHeader: 'numeral'`) | Start | Paper | The primary label is in the display face (`type-action`) |
| Colour-coded | `StepBar` | Start | Paper | With ingredient colours on (this skin’s default), the three step-2 discs take `--spice-1-soft` / `--spice-1` … `--spice-3` instead of accent-soft |
| Colour field | `StepBar` | Centred | **The whole flow is on `data-surface="field"`** (`cookSurface: 'field'`), like cook mode | Cards (denied steps) sit on the field exactly as cook mode’s sheets do |

- **Light and dark:** these follow the tokens. The logo already has a light and a dark mark.
- **Saffron:** accent marks use `--accent-mark`, and accent text uses `--accent-text`.

### Accessibility checklist for these screens

- Exactly one primary button per step, in every state.
- Every target is at least 56px. Back, Skip, Not now and restore are full buttons, not bare text links.
- Every icon has a visible label.
- The progress is text (“Step 2 of 3”), and the bar and dots are `aria-hidden`.
- The tab order follows the page: Back, Skip, content, primary.
- Hear it and Stop use `aria-pressed`.
- There are no exclamation marks and no emoji. All copy is sentence case.

### Copy (`src/i18n/en.ts`, `ui.onboarding`)

```ts
onboarding: {
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  skip: 'Skip',
  skipHint: 'Esc to skip',
  next: 'Next',
  // Step 1
  welcomeEyebrow: 'Welcome to Bookcook',
  welcomeTitle: 'A cookbook you can talk to.',
  welcomeBody: 'Keep the recipes that only live in someone’s head. Say them out loud or type them, then cook from them with your hands free.',
  textSizeLabel: 'Pick a size that’s easy to read',
  textSizeHint: 'You can change it any time in Settings.',
  restore: 'Restore a backup',
  // Step 2
  voiceTitle: 'Tell it, and we’ll write it down.',
  voiceTell: 'Say it out loud',
  voiceTellBody: 'Answer a few questions, one at a time. You check the recipe before it’s saved.',
  voiceCook: 'Cook with busy hands',
  voiceCookBody: 'Each step is read to you, and Bookcook listens while you cook, so you don’t have to touch the screen.',
  voiceType: 'Or type it',
  voiceTypeBody: 'Typing always works too, and every field has a Speak button.',
  hearIt: 'Hear it',
  // Step 3
  micTitle: 'Let Bookcook hear you',
  micBody: 'Your browser will ask to use the microphone. Bookcook only listens while a mic button is on, or while you cook.',
  allowMic: 'Allow the microphone',
  notNow: 'Not now',
  micGranted: 'Bookcook can hear you',
  micGrantedBody: 'Tap any mic button to talk.',
  micDeniedBody: 'You can still type everything. To talk later, turn the mic on:',
  blockedStepsNative: ['Open your phone’s Settings.', 'Go to Apps, then Bookcook, then Permissions.', 'Turn on Microphone, then come back.'],
  micUnsupportedBody: 'You can still type every recipe. Chrome and Edge can hear you.',
  finish: 'Open my cookbook',
},
// settings
showWelcome: 'Show the welcome again',
```

Reused keys: `common.back`, `settings.textSize` and `settings.textSizes`, `settings.textPreview`, `cook.stop`, `capture.blocked`, `capture.blockedSteps`, `capture.tryAgain`, `capture.noSpeechTitle`.

**Out of scope:** Tell it’s mic-blocked steps also talk about “the lock by the web address”, which is wrong in the APK. Onboarding gets `blockedStepsNative`. Switching Tell it to use it is a small follow-up, not part of this spec.

---

## Part 2: Motion

### Principles

- Motion is calm and short. It shows where something came from or that something happened, never decoration.
- There are no page or route transitions. Changing screens is instant, as it is today.
- **Entering:** `--dur` (200ms) with `--ease-out`, as the handoff sets.
- **Leaving:** faster, 150ms with a new ease-in, so that what’s going gets out of the way.
- **Travel is small:** 8–24px, never across the screen.
- **Nothing loops**, except the existing breathe on the mic and listening dot. Hot timers don’t pulse, so there is one repeating animation and it means “listening”.

### Where the new values live

All app motion moves into a new file, `src/design/motion.css`, so every design value is in `src/design/`:

- **What goes in it:** the new values below, all the new keyframes, and the cook-step slide and parse-preview fade, which move out of `src/styles/index.css`.
- **What imports it:** `src/styles/index.css` imports it after `theme.css`.
- **What stays as it is:** the handoff's base motion (`--dur`, `--ease-out`, rise, pop, breathe) stays in `tokens.css`. `tokens.css` and `theme.css` stay unchanged, so a future handoff can still be dropped in and diffed cleanly.
- **Docs:** `src/design/README.md` gets a line naming `motion.css` as the one file in `src/design/` that the app owns.

```css
--ease-in: cubic-bezier(.4, 0, 1, 1);
--dur-exit: 150ms;
```

### Reduced motion

Two rules already exist:
- `tokens.css` sets `--dur` to 1ms and turns off breathe and pop.
- `index.css` forces every animation and transition to 1ms.

Both stay. Under reduced motion, every item below:
- **Keeps the state change.** The new step shows, the box is checked, the timer turns hot, and the sheet opens and closes.
- **Drops the travel, scaling and fading.** The change is instant.
- **Is still announced.** The live regions listed below do this; they don’t depend on the animation.
- **Has no JS fallback that moves things:** `useReorder`’s transforms and any scrolling use `behavior: 'auto'`.

### The list

| # | Where | What moves | Duration and easing | Reduced motion |
|---|---|---|---|---|
| 1 | **Cook mode, step change** (exists) | The step body slides 24px from the side it comes from (Next from the right, Back from the left), with a cross-fade | 200ms, `--ease-out` | The new step appears at once |
| 1a | Cook mode, the progress bar | The segment colours change (done → ink, current → accent-mark) | 200ms, `--ease-out` | Instant |
| 1b | Cook mode, the numeral (spice tin) | The old numeral fades out and the new one rises 8px | Out 150ms `--ease-in`, in 200ms `--ease-out` | Instant |
| 1c | Cook mode, the announcement | New: a visually hidden `aria-live="polite"` region reads “Step 3 of 5” and the step text on every change. Today a step change isn’t announced | — | The same |
| 2 | **Sheets**, entering (exists) | Rise 12px and fade in (`--animate-rise`) | 200ms, `--ease-out` | Instant |
| 2a | Sheets, leaving (new) | Drop 8px and fade out. React Aria’s `data-[exiting]` keeps the sheet mounted until this ends | 150ms, `--ease-in` | Instant |
| 2b | The sheet scrim (new) | Opacity 0 → 1, and back | In 200ms `--ease-out`, out 150ms `--ease-in` | Instant |
| 3 | **Toasts** | Rise in (exists). Leaving on timeout or Undo: fade out (new) | In 200ms, out 150ms | Instant |
| 4 | **Popovers and menus** (mention, sort, autocomplete) | Rise in (exists). Leaving: fade out (new) | In 200ms, out 150ms | Instant |
| 5 | **Check-offs** (cook checklist, grocery) | The box pops (exists, `--animate-pop`) | 260ms, `--ease-out` | No pop, checked at once |
| 5a | Check-offs, the label (new) | The strike-through draws left to right: a pseudo-element line, `scaleX` 0 → 1. The text fades to ink-muted. Unchecking reverses both | 200ms, `--ease-out` | Struck and muted at once |
| 5b | Grocery, **Clear checked** (new) | The cleared rows fade out, then collapse (`grid-template-rows: 1fr → 0fr`) so the rows below close up. **Undo** reverses it: expand, then fade in | Fade 150ms `--ease-in`, then collapse 200ms `--ease-out` | The rows are removed at once. The UndoToast still appears |
| 6 | **Timers, a new pinned timer** (new) | The tile rises in (`--animate-rise`) | 200ms, `--ease-out` | Appears at once |
| 6a | Timers, turning hot (new) | The tile’s background and text colours change to `--timer-hot-*`. The icon swaps to `alarm` and pops once | Colour 400ms `--ease-out` (slower, so it reads as warming), pop 260ms | The colour changes at once, with no pop |
| 6b | Timers, the ring (exists) | The conic fill follows the 1s tick. It isn’t transitioned: it’s a clock, so it moves in steps | — | The same |
| 6c | Timers, **TimerAlert** (new) | The alert rises in (`--animate-rise`). There is no shake or flash. The chime and voice carry the urgency | 200ms, `--ease-out` | Appears at once. It is still `role="alert"`, with the chime and speech |
| 6d | Timers, done or stopped (new) | The tile fades out and the other tiles close up without moving (the grid reflows instantly) | 150ms, `--ease-in` | Removed at once |
| 6e | Timer chips in step text (exists) | The background colour changes as the chip goes from idle to running to done | 200ms | Instant |
| 7 | **Onboarding, step change** (new) | The same as #1: the body slides 24px with a cross-fade, from the direction of travel (`animate-step-next` / `animate-step-back`). The top bar and bottom bar don’t move | 200ms, `--ease-out` | Instant, with focus moving to the step heading |
| 7a | Onboarding, progress | The same as #1a and #1b | As #1a and #1b | Instant |
| 7b | Onboarding, mic granted | The disc changes colour, and the `check` icon pops once | Colour 200ms, pop 260ms | Instant, announced by `role="status"` |
| 8 | **In her words**, opening and closing (new) | The height animates (`grid-template-rows: 0fr → 1fr`), and the chevron turns 180° | 200ms, `--ease-out` | Opens and closes at once |
| 9 | **Draft saved** indicator (new) | “Saving…” and “Draft saved” cross-fade in place | 150ms, `--ease-out` | Instant |

These existing items are unchanged:
- The mic and listening dot breathe.
- The parse preview fades in after typing pauses.
- The newest Tell it row is tinted for 1.2s.
- Buttons scale to .97 when pressed.
- Recipe cards lift on hover.
- The Switch thumb slides.
- Rows animate when they are reordered.

**Left out on purpose:**
- Route transitions.
- A parallax or scroll-linked effect.
- An in-app reduce-motion switch. The OS setting is respected. An in-app switch can be added later if testers ask for it.
- Skeleton shimmer. The existing skeletons stay still.

---

## Build order

Each item is one commit on `wip/phase-12`. Each commit passes the checks in `AGENTS.md` and is screenshot-checked against `ACCEPTANCE.md` where it’s visible.

1. **Mic permission helper:** `src/lib/platform/micPermission.ts` (`micState`, `requestMic`, web and native), with unit tests using mocked `navigator.permissions`, `getUserMedia` and the plugin.
2. **Onboarding strings:** add `ui.onboarding` and `settings.showWelcome` to `en.ts`.
3. **The `/welcome` route and frame:**
   - The full-screen page, top bar, progress by skin (`StepBar` / `StepNumeral`), the colour-field surface and the steps in the URL.
   - Back, Skip and Esc, focus on the heading, and the phone bottom bar with the desktop inline primary.
   - Step 1: welcome, text size and restore.
4. **Step 2, Voice:** the three rows (with spice discs in colour-coded) and Hear it / Stop.
5. **Step 3, Microphone:** the ask, granted, denied and unsupported states, the `role="status"` result and the native blocked steps.
6. **First-run gate:** `shouldOnboard()` with tests, the redirect from `/`, existing users marked silently, and focus on the empty state heading after landing.
7. **Settings:** the **Show the welcome again** row and the `from=settings` return.
8. **Motion base and sheets:**
   - Create `src/design/motion.css` with `--ease-in` and `--dur-exit`, move the existing cook-step and fade-in keyframes into it, and note it in `src/design/README.md`.
   - The sheet exit and scrim fade (#2a, #2b).
   - The toast and popover exits (#3, #4).
9. **Cook mode step:**
   - The progress and numeral transitions (#1a, #1b).
   - The `aria-live` step announcement (#1c).
10. **Check-offs:** the strike-through draw (#5a) and the grocery Clear checked collapse with Undo (#5b).
11. **Timers:** the new tile, hot, the alert, and done (#6, #6a, #6c, #6d).
12. **Small pieces:**
    - The onboarding step slide and the mic granted pop (#7, #7b).
    - The In her words collapse (#8).
    - The Draft saved cross-fade (#9).
13. **Acceptance pass:**
    - Check onboarding and every motion item across the matrix: 5 skins, light and dark, Normal / Large / Huge, 390px and 1280px, keyboard, screen reader, and reduced motion on.
    - Fix what fails, then tick the onboarding and motion parts of the Phase 12 roadmap item.

---

## As built

Where the build differs from the text above:

- **Back on desktop** sits beside the primary button, not in the top bar (the top bar there holds the logo, the progress and Skip). On a phone it's in the top bar, as specified.
- **The first-run check** is a route loader on `/` (`src/features/onboarding/firstRun.ts`), so it runs before anything is drawn. Finishing stores `onboarded` before navigating, or the loader would send the user back.
- **Numeral (#1b):** the new numeral rises in; the old one is not kept on screen to fade out.
- **Strike-through (#5a):** the line is a background that grows from 0 to 100%, not a `scaleX` pseudo-element, so it follows the text over wrapped lines.
- **Grocery collapse (#5b):** the rows are kept until the fade and collapse have played (350ms), then removed. Undo puts them back with a row-in animation.
- **In her words (#8):** the height follows React Aria's `--disclosure-panel-height` rather than `grid-template-rows`.
- **Timers done or stopped (#6d):** a faded copy stays in the tile's place for the fade, then the others close up.
- **Toasts (#3):** a toast fades out before it is removed, after its timeout or when Undo is pressed.
- **Draft saved (#9):** the new state fades in over the old one.
- **Tick targets:** at Normal size the shared 3.5rem controls measure 50px, as on every other screen; Large and Huge are above 56px.

