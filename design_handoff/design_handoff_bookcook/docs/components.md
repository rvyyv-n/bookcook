# Bookcook — components

Built on React Aria Components and Tailwind v4 with the tokens in `src/design/tokens.css`. Sizes are in rem (1rem = 18px × text scale). States are shared by all skins, and skins only change tokens plus `skin.ts` keys.

Shared states:
- **hover**: secondary uses `--control-fill-hover`, primary uses `--accent-strong`, quiet uses `--sunk`.
- **focus-visible**: 3px `--focus` ring, offset 3px.
- **pressed**: `scale(.97)`, with `--accent-strong` or `--line` as the fill.
- **disabled**: `--sunk` fill (or a `--line` outline) with `--ink-muted` text. Not focusable. It keeps its label.

| Component | Props | States | Notes |
|---|---|---|---|
| **Button** | `variant: primary \| secondary \| quiet \| destructive`, `size: L (56) \| XL (64)`, `icon?`, `label` | default, hover, focus, pressed, disabled | The label is required. There's one primary per screen. Primary uses the `--action-*` font. Destructive acts, then shows an Undo toast. |
| **CookControls** | `onBack`, `onNext`, `reading`, `onRead`, `isLast` | reading → "Stop" (`stop_circle`, aria-pressed); isLast → "I made it" (`celebration`) | Grid `1fr 1fr 1.5fr`, 76px tall, `flex-direction: var(--cook-btn-direction)`. |
| **ListeningIndicator** | `state: listening \| paused \| heard`, `heard?` | the three states | A pulse (`--animate-breathe`, `--accent-mark`) plus one word. Commands appear in the tooltip only. |
| **BigMicButton** | `state: idle \| listening \| processing \| disabled \| denied`, `onToggle` | idle "Tap to talk", listening "Listening…" (breathe), processing "Writing it down" (spinner), disabled "Wait a moment", denied (dashed, help + Type instead) | 120px (`6.667rem`). A single-tap toggle. `aria-pressed` while listening. |
| **TextField** | `label`, `value`, `onChange`, `error?`, `dictate = true` | empty, focus, filled, speaking, error, disabled | Border `--line-control` 1.5px, 2px ink on focus. Radius `min(var(--radius-md), 18px)`. The Speak button (56px) sits inside at the right. Errors show text with an `info` icon. |
| **SmartIngredientLine** | `text`, `parsed: ParsedIngredient`, `suggestions?`, `needsCheck?` | typing + preview, autocomplete, section heading (ends with ":"), parsed row, "Check this" | The preview fades in 300ms after the last keystroke, showing **qty** · **unit** · name · *note*. Autocomplete is a React Aria ComboBox. Enter makes a new line. |
| **SectionHeading** (ingredients) | `name`, `spiceGroup?` | spice off / on | `data-spice-group`. Dot uses `display: var(--sp-show)`, hairline uses `display: var(--sp-rule)`, colour uses `var(--sp-heading)`. |
| **Mention** | `ingredient: Ingredient`, `spiceGroup?` | default, focus, popover open | `role="button"`, with an aria-label like "chicken, 1 kg". Styled from `--mention-*`. The popover shows the scaled amount and closes on tap, Esc or after 4s. |
| **StepRow** (editor) | `step: Step`, `index`, `onMove`, `onAddPhoto` | default, editing, dragging (lift + −0.6°), Move open (Up / Down) | Drag is always paired with Move. Timer chips and mentions are detected live from the text. |
| **TimerChip** (inline) | `seconds`, `state` | idle, running ("12:04 left"), done | Tapping it starts a PinnedTimer. |
| **PinnedTimer** | `label`, `remaining`, `total`, `state: running \| hot \| paused \| finished`, `spiceGroup?` | running, hot (< 60s: `--timer-hot-bg`/`fg`), paused, finished → TimerAlert | Ring box `--timer-ring`, fill `conic-gradient(var(--timer-ring-fill) 0 p, var(--timer-ring-track) 0)`. Layout from `skin.timers`. aria-label is "Rice timer, 42 seconds left, almost done". |
| **TimerAlert** | `label`, `onStop`, `onAddMinute` | — | `role="alert"`, accent fill, full width. Spoken, with a repeating soft chime. |
| **RecipeCard** | `recipe: Recipe` | default, hover (−2px), focus | The whole card is one link. Shows the photo (or striped placeholder), title, author · time, and "Made N times" or "Based on X". |
| **DraftCard** / **RequestCard** | `draft` / `request` | — | Each has one action: Continue / Tell it. |
| **Chip** (filter) | `selected`, `label` | on, off, hover, focus | A ToggleButton. 56px pill. |
| **Segmented** | `options`, `value` | — | A RadioGroup. Used for Metric/Imperial and Text size (labels shown at their real sizes). |
| **ServingsStepper** | `value`, `min = 1` | normal, min (− disabled) | `aria-live="polite"` on the value. The buttons carry aria-labels "Fewer servings" / "More servings". |
| **ChecklistItem** | `item: GroceryItem \| Ingredient`, `checked` | unchecked, checked (pop, strikethrough, muted), hover, focus | `role="checkbox"` on the whole row. Box border `--line-control`. |
| **Sheet** | `title`, `onClose` | open (`--animate-rise`) | Bottom on phone, centred on desktop. Always has a visible Close. Focus is trapped. |
| **UndoToast** | `message`, `onUndo` | — | `role="status"`, ink fill, 6s, pauses on hover or focus. It sits above the tab bar. |
| **SavedIndicator** | `state: saving \| saved` | — | Shows `cloud_done` and "Draft saved". |
| **VoiceNotePlayer** | `media: Media`, `duration` | idle "Play · 0:48", playing "Pause" + progress + "0:12 / 0:48" | The labels always stay. |
| **StoryQuote** | `story: StoryAnswer` | with or without audio | The prompt is in muted bold, and the answer in display italic. Never edited. |
| **EmptyState** | `eyebrow`, `title`, `action` | — | One big primary: "Let's save your first recipe". |
| **TabBar** (phone) | `current` | current (FILL 1, ink, bold), other (muted) | 5 equal columns. The New disc (`--tab-new-bg`) stays inside its own column and never overlaps its neighbours. |
| **Sidebar** (desktop) | `current` | current (surface + shadow), hover, focus (inset ring) | New recipe, Cookbook, Collections, Tags, Grocery, Requests, Settings. |

## Skin config (`src/design/skin.ts`)
```ts
export type Skin = 'quiet' | 'heirloom' | 'spice-tin' | 'colour-coded' | 'colour-field';
export const skinConfig: Record<Skin, {
  stepHeader: 'bar' | 'numeral';
  timers: 'tiles' | 'tray' | 'pills' | 'rings';
  hero: 'bleed' | 'fieldBand';
  detailAlign: 'start' | 'center';
  actions: 'grid' | 'list' | 'iconRow';
  cookSurface: 'paper' | 'field';
  spiceDefault: boolean;
}> = {
  quiet:          { stepHeader: 'bar', timers: 'tiles', hero: 'bleed', detailAlign: 'start', actions: 'grid', cookSurface: 'paper', spiceDefault: false },
  heirloom:       { stepHeader: 'bar', timers: 'tray', hero: 'bleed', detailAlign: 'center', actions: 'list', cookSurface: 'paper', spiceDefault: false },
  'spice-tin':    { stepHeader: 'numeral', timers: 'pills', hero: 'bleed', detailAlign: 'start', actions: 'iconRow', cookSurface: 'paper', spiceDefault: false },
  'colour-coded': { stepHeader: 'bar', timers: 'rings', hero: 'bleed', detailAlign: 'start', actions: 'iconRow', cookSurface: 'paper', spiceDefault: true },
  'colour-field': { stepHeader: 'bar', timers: 'pills', hero: 'fieldBand', detailAlign: 'center', actions: 'iconRow', cookSurface: 'field', spiceDefault: false },
};
```

## Motion
- Mic and pulse: `--animate-breathe` (2.4s, scale 1.08 plus a soft ring in `--accent-soft`).
- Sheets and toasts: `--animate-rise`, using `--dur` (200ms) and `--ease-out`.
- Check-offs: `--animate-pop` (260ms). Cook steps slide 24px, with a 200ms cross-fade.
- The parse preview fades in 150ms after a 300ms idle.
- Reduced motion keeps the state changes and drops travel and breathing.
