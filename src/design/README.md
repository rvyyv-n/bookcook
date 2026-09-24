# Design layer

Everything visual that comes from the design lives here, so a new design (the design handoff) can replace it without touching app logic.

| File         | What it holds                                                                       |
| ------------ | ----------------------------------------------------------------------------------- |
| `tokens.css` | Every design value: colours (light and dark), type, spacing, radius, shadow, motion |
| `fonts.css`  | Font imports (self-hosted via `@fontsource`)                                        |

The current values are a **placeholder** built from [`docs/design-brief.md`](../../docs/design-brief.md).

## How it's wired

- `src/styles/index.css` imports these two files and maps the colour tokens to Tailwind utilities (`bg-paper`, `text-ink`, `border-line`, `bg-accent`, …). Components only use those utility names, never raw values.
- Theme: `<html data-theme="dark">` is set by the app (`src/app/providers.tsx`). Dark values go under `:root[data-theme='dark']`.
- Text size: the app sets `data-text-size`, which changes `--scale`; `html { font-size }` multiplies by it. **1rem = 18px at Normal.** Size everything in `rem` so the Large and Huge settings scale the whole layout.
- The browser's `theme-color` is read from `--paper` at runtime.

## Token contract

Keep these names. Values are free to change.

**Colour** (define in both `:root` and `:root[data-theme='dark']`):

| Token                          | Use                                         |
| ------------------------------ | ------------------------------------------- |
| `--paper`                      | App background                              |
| `--surface`                    | Cards, sheets                               |
| `--sunk`                       | Recessed areas: inputs, sidebar             |
| `--ink`                        | Body text (AAA on paper)                    |
| `--ink-muted`                  | Secondary text (≥ 4.5:1)                    |
| `--line` / `--line-strong`     | Hairlines / control borders                 |
| `--accent` / `--accent-strong` | Primary actions, mic / hover state          |
| `--accent-soft`                | Highlights, ingredient mentions             |
| `--accent-ink`                 | Text on accent                              |
| `--accent-text`                | Accent used as text on paper                |
| `--success` / `--success-soft` | Check-offs                                  |
| `--danger` / `--danger-soft`   | Destructive actions                         |
| `--focus`                      | Focus ring                                  |
| `--shadow-color`               | Space-separated `r g b` used inside shadows |

**Type:** `--font-display`, `--font-display-settings` (variation settings), `--font-display-weight`, `--font-body`, `--font-handwritten`, `--font-handwritten-settings` (the "In her words" transcript).

**Tailwind `@theme` scale:** `--spacing`, `--text-sm` … `--text-4xl` (each with `--line-height`), `--radius-sm/md/lg/xl`, `--shadow-paper`, `--shadow-lift`, `--animate-breathe` (listening mic), `--animate-rise` (sheets, toasts), `--animate-pop` (check-offs), plus `--ease-out` and `--dur`.

Adding a token: define it in `tokens.css`; if it's a colour, also map it in the `@theme inline` block of `src/styles/index.css`.

## Importing the design handoff

1. Replace the values in `tokens.css` with the handoff's tokens, keeping the names above (rename theirs to match, or add new ones).
2. Update `fonts.css` if the typefaces changed (`npm i @fontsource/<family>`).
3. Restyle `src/ui/` components against the component sheet. They are the only place with component-level styling decisions.
4. Adjust screen layouts in `src/app/` and `src/features/*` to match the final screens.
5. Check Normal and Huge text size, light and dark, at 390px and 1440px (`node scripts/shot.mjs` takes screenshots).
