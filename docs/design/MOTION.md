# Motion

How Bookcook moves, and how to add motion that fits. The values live in [`src/design/motion.css`](../../src/design/motion.css) (and the handoff's base in `tokens.css`). The history of the first pass is in [`onboarding-and-motion.md`](onboarding-and-motion.md).

## The feel

**Calm, satisfying, smooth.** The app is for cooks aged 55–75, often with busy hands, so motion is there to explain, never to show off:

- **It shows what happened.** Where something came from, where it went, that it's done.
- **It lands softly.** Things arrive quickly and ease the last few pixels, with no bounce or wobble. Think of a sheet of paper settling on a counter, not a ball.
- **It never makes you wait.** Nothing blocks a tap. The longest move is a page change (340ms). A finish (the tick on Save) holds for less than half a second.
- **It follows your finger.** Anything you drag (a sheet, a toast, a reordered row) tracks the finger 1:1, and when you let go it settles from where it is.
- **It stops when asked.** Under Reduce Motion every change still happens, instantly.

Borrowed from:

| Source | Idea |
|---|---|
| Apple (iOS) | Direct manipulation: drag, let go, settle. A screen opened from another slides over it. |
| Things 3 | Finishing something is a small, quiet reward: the box pops and the tick draws itself. |
| Linear | Fast and quiet: most moves are 150–320ms, nothing loops, nothing bounces. |
| Material 3 | Durations named by role, not by number, and one element growing into the next screen. |

## Tokens by role

Components name the role; they never write their own milliseconds, Tailwind `duration-300` or curves. `src/ui/motion.test.ts` fails the build if they do.

| Role | Token | Time | Curve | For |
|---|---|---|---|---|
| give | `--dur-give` | 90ms | `--ease-out` | A press: the button gives under the finger (automatic on `[data-pressed]`) |
| exit | `--dur-exit` | 150ms | `--ease-in` | Leaving: what goes gets out of the way |
| base | `--dur` | 200ms | `--ease-out` | Appearing, and most changes of colour or state |
| settle | `--dur-settle` | 320ms | `--ease-settle` | Something finding its new place or shape |
| page | `--dur-page` | 340ms | `--ease-page` | Moving between screens |
| slow | `--dur-slow` | 400ms | `--ease-out` | A change that shouldn't draw the eye (a timer warming) |

Curves:
- `--ease-out` (handoff): quick start, soft end. The default for everything.
- `--ease-in`: slow start, quick end. Only for leaving.
- `--ease-settle`: a long, soft landing, no overshoot. For moves over a distance and for finishes.
- `--ease-page`: the page slide.

## The moves

Every animation is one of these. If a new one doesn't fit any, it probably isn't needed.

| Move | What it looks like | Tokens | In the app |
|---|---|---|---|
| **Give** | Scales to .97 (a big disc to .9) while pressed | give | Buttons, tabs, the New disc, action discs |
| **Appear** | Rises 12px and fades in; a photo fades up once loaded | base (photos: settle) | Sheets, toasts, popovers, new timers, photos |
| **Leave** | Fades (sheets also drop 8px); a row then collapses | exit | Sheets, toasts, cleared grocery rows, a removed request |
| **Settle** | Glides from its old place to its new one | settle | The tab bar's highlight opening out behind the tab you open, sorting and filtering the cookbook, Undo putting a card back, aisles closing up, a toast let go short of the edge, the editor tabs scrolling to the chosen one |
| **Morph** | One thing becomes another in place | settle | A recipe card's photo grows into the recipe's; Save recipe turns into a tick |
| **Count** | A changed number rolls up (more) or down (fewer) | settle | Servings, and the amounts that follow them |
| **Fill** | A bar or segment fills from its start | settle | Cook mode's step bar |
| **Celebrate** | The box pops, then the tick draws itself | pop 260ms, then settle | Ticking a grocery or cooking item |
| **Stagger** | A set arrives one item after another, 40ms apart, first view only | base | Recipe cards, collections, requests, aisles, empty pages |
| **Page** | Slides over (phone), cross-fades (tabs, desktop) | page | Every navigation |
| **Breathe** | A slow pulse. The only loop, and it always means "listening" | 2.4s | The mic and listening dot |

## Building blocks

In `src/ui`:

- `useStagger(key, index)`: the first-view stagger.
- `useFlip()` + `data-flip="<key>"` on each direct child: the settle for a list whose items come, go or reorder in place. `leave(el)` fades an item out before you remove it.
- `<Rolling value>` inside `<RollScope value>`: the count.
- `useDone()` + `<Button done>`: the morph to a tick before the screen changes.
- `FoldPanel`: a fold that opens and closes with its content fading.
- `prefersReducedMotion()`: for any motion started from script (scrolls, Web Animations).

In `motion.css`: the `animate-*` utilities (`rise`, `pop`, `count-up`/`-down`, `draw`, `photo-in`, `tab-in`, `morph-in`, `row-in`, `drop-out`, `fade-out`, `step-next`/`-back`, `stagger`).

## Checklist for a new animation

1. **Which move is it?** Use that move's tokens. Don't add a new duration.
2. **Does it help someone follow what happened?** If it's only there to look nice, leave it out.
3. **Can it be interrupted?** A tap mid-animation must work, and a drag starts from where the thing is now.
4. **Transform and opacity only** (plus colour). Don't animate width, height or top, except for the grid-rows collapse already in use.
5. **Shorter than a page change.** Nothing over 340ms apart from the page itself and slow.
6. **Only on change, never on first show**, unless it's the stagger. Coming back to a screen, things are simply there.
7. **Reduce Motion.** CSS is covered by the global rule. Anything started from script checks `prefersReducedMotion()`.
8. **Check it** at 390px and 1280px, in a Tin skin and a paper skin, light and dark.
