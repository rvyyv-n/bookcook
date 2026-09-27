# Bookcook — themes, accessibility, voice and copy

Source of truth for values: `src/design/tokens.css`. Live reference: `Bookcook Design System.dc.html`.

## Switches (on `<html>`)
| Attribute | Values | Notes |
|---|---|---|
| `data-skin` | `quiet` · `heirloom` · `spice-tin` · `colour-coded` · `colour-field` | Default `quiet`. The three Tin skins share one base. |
| `data-theme` | `light` · `dark` | System → resolve in JS, then set the attribute. |
| `data-accent` | `tomato` · `saffron` | `colour-field` ignores it and stays fixed tomato. |
| `data-text-size` | `normal` · `large` · `huge` | Sets `--text-scale` 1 / 1.2 / 1.45. `html{font-size:18px*scale}`, so every rem scales. |
| `data-spice` | `on` · `off` | Ingredient colours. Works in every skin. `colour-coded` defaults to on when it's chosen. |

Local attributes:
- `data-surface="field"` goes on the cook-mode root and the detail header in `colour-field`. It remaps every colour token to the field.
- `data-spice-group="1..4"` goes on an ingredient section heading, a step mention or a timer. Set it from the section's order of appearance (first section → 1, and so on, wrapping after 4). Ingredients without a section use group 1. If a recipe has fewer than 2 sections, don't set it at all, because colour would mean nothing.

## Skins
1. **Quiet Page**: Fraunces light (titles 380, headings 300, steps 340), flat paper, hairlines, no cards. Mentions get a soft highlighter band and an accent underline.
2. **Letterpress Heirloom**: EB Garamond (titles 500; steps 560 at 40px, never lighter), paper grain, small-caps headings centred between rules, inset tray for timers, italic accent mentions with a dotted underline.
3a. **Spice Tin**: Fraunces SOFT 100 / WONK 1, weight 800. Controls are pills (`--radius-md: 999px`), secondary controls are filled with `--sunk`, timers are pills with a conic ring, the step number is a big numeral, and primary labels are set in the display font.
3b. **Colour-coded**: 3a with bare ring timers and ingredient colours on by default.
3c. **Colour field**: 3a, but cook mode is one full field (`data-surface="field"`) and the detail header is a field band with a round photo. Eyebrow weight is 340. The accent is fixed tomato.

### Ingredient colours in each skin
- Quiet and Heirloom: a small dot and a coloured hairline on the section heading. The mention underline takes the spice colour. **Text stays ink.**
- Tin family: the section heading text takes the spice colour, mentions become tinted pills (`--spice-n-soft` fill, `--spice-n` text), and timer rings take the spice colour.
- Palette: 1 turmeric, 2 cardamom, 3 mint, 4 chilli (crimson, kept visibly bluer than tomato).

## What isn't a token → `skin.ts`
| key | quiet | heirloom | spice-tin | colour-coded | colour-field |
|---|---|---|---|---|---|
| `stepHeader` | bar | bar | numeral | bar | bar |
| `timers` | tiles | tray | pills | rings | pills |
| `hero` | bleed | bleed | bleed | bleed | fieldBand (round photo) |
| `detailAlign` | start | center (diamond rule) | start | start | center meta |
| `actions` | grid | list | iconRow | iconRow | iconRow |
| `cookSurface` | paper | paper | paper | paper | field |

Everything else (colour, type, weights, radius, grain, mention style, button fill and border, cook button direction, timer ring size and colour, New-tab fill) is a token.

## Contrast audit
Measured on paper in each skin.

| Skin · mode | ink | muted | white/tomato · ink/saffron | accent as mark (T · S) | line-strong |
|---|---|---|---|---|---|
| Quiet L | 16.0 | 7.6 | 5.7 · 7.9 | 5.3 · **2.0** | **1.8** |
| Quiet D | 15.8 | 8.9 | 6.8 · 10.0 | 6.6 · 9.9 | **2.2** |
| Heirloom L | 13.3 | 7.5 | 5.7 · 7.9 | 4.8 · **1.8** | **2.0** |
| Heirloom D | 14.3 | 8.9 | 6.8 · 10.0 | 6.5 · 9.7 | **2.2** |
| Tin L | 14.9 | 7.6 | 5.7 · 7.9 | 4.9 · **1.9** | **1.7** |
| Tin D | 15.3 | 9.2 | 6.8 · 10.0 | 6.6 · 9.9 | **2.2** |
| Field | field-ink/field 7.3 L · 8.7 D | | | | |

- Every skin meets ink ≥ 7 and muted ≥ 4.5 in both modes. Muted is actually ≥ 6.7.
- **Saffron as a mark** (progress, pulse, rings, underlines) fails 3:1 on light paper. The new `--accent-mark` is #B8791A (3.1–3.4:1). Fills keep #E9A23B.
- **`--line-strong`** is fine on labelled buttons, but too faint to find inputs and checkboxes. The new `--line-control` is 3.2–3.7:1 in light and 3.4:1 in dark.
- **White on tomato** is 5.7:1: AA, not AAA. #9E3521 would reach 7:1, but it reads as brick. It's unchanged for now, pending your decision.
- Spice colours are 6.9:1 or more on paper and 6.5:1 or more on their soft pills.

## Accessibility
- Body text 18px or larger. Ink AAA. Muted is never required to act.
- Targets 56px or more (tab items 64px). Whole rows are targets.
- Every icon has a visible label. No icon-only buttons.
- No hidden gestures: drag has **Move → Up / Down**, and swipe has a visible button.
- Destructive actions act at once, then show an Undo toast (6s, pauses on focus, and can be spoken).
- Focus: `outline: 3px solid var(--focus); outline-offset: 3px`. On field surfaces, focus uses field-ink.
- Large and Huge must reflow, never clip. Check every screen at Huge.
- Reduced motion: `--dur` drops to 1ms, and breathe and pop are off. State changes stay and are announced (`aria-live`).
- Colour is never the only signal.

## Voice
- Cook commands: **next · back · repeat · timer · stop**. They appear in the tooltip and in Settings only.
- Listening indicator: a pulse plus one word — `Listening` / `Paused` / `Heard "next"` (1s).
- **Read** speaks the step and becomes **Stop** while speaking (`aria-pressed`). Next and Back stop speech first.
- On the last step, **Next** becomes **I made it**, which opens the sheet (rating, photo, note).
- Tell it: "next" after each item and "done" to finish. The helper line appears once, under the question.
- Live partial words appear in `--ink-muted` and turn to ink once parsed. The newest row is tinted `--accent-soft` for 1.2s.
- The mic is always a single-tap toggle. If speech isn't supported, hide the mic and make Type it primary. If it's denied, show friendly steps and Type instead.
- Timer finished: a full-width alert, a repeating soft chime and a spoken line. "stop" silences it.

## Copy
- Use one-word actions: Save, Edit, Share, Print, Read, Next, Back, Undo, Speak, Move.
- Name outcomes: "Save recipe", "Start cooking", "Tell it", "I made it". Never Submit, Proceed, OK or Confirm.
- Say "Read", not "Read aloud", and "Speak", not "Dictate".
- Errors say what to do: "We couldn't read that page. Try Paste it instead."
- Her words are never corrected. Only the structured recipe is tidied.
- "a handful", "a pinch" and "to taste" are valid quantities.
- No exclamation marks, filler stats or emoji in the UI. Sentence case everywhere; small caps come from a token.

## Icons
Material Symbols Rounded (the set used in the mockups): weight 400, FILL 0 by default, FILL 1 for active or current. Gaps are filled from the same set, so nothing custom is drawn: `mic`, `mic_off`, `graphic_eq`, `keyboard`, `content_paste`, `link`, `drag_indicator`, `arrow_upward`, `arrow_downward`, `add_a_photo`, `undo`, `check`, `help`, `info`, `pause`, `star`, `search`, `sort`, `collections_bookmark`, `sell`, `cloud_done`, `delete`. Subset the font to the icons you use.
