# Design layer

Everything visual that comes from the design handoff lives here. The handoff docs are in [`docs/design/`](../../docs/design/) (start with `README.md`; decisions taken on it are in `DECISIONS.md`).

| File         | What it holds                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens.css` | **Source of truth.** Every colour, type, space, radius, shadow and motion value, for all five skins, light and dark, both accents and three text sizes |
| `theme.css`  | The CSS entry: Tailwind, self-hosted fonts, tokens, and the `@theme inline` mapping to utilities (`bg-paper`, `text-accent-text`, `font-title`, …)     |
| `skin.ts`    | The six layout differences between skins that tokens can't express (`skinConfig`), `applyAppearance()` and `spiceGroups()`                             |
| `icons.ts`   | The Material Symbols → lucide-react mapping. Render icons with `src/ui/Icon.tsx`                                                                       |
| `motion.css` | **Owned by the app, not the handoff.** The leaving ease and duration (`--ease-in`, `--dur-exit`) and the animations built on them                      |

**The first four files are kept byte-identical to the handoff** (they're in `.prettierignore`). Adapt the app to them rather than editing them; a new handoff replaces them wholesale and leaves `motion.css` alone.

## How it's wired

- `src/styles/index.css` imports `theme.css`, then adds app behaviour that doesn't change with the design: heading defaults, the `type-display` / `type-handwritten` / `type-action` utilities, the `desk:` breakpoint (900px) and print rules.
- **Text size:** the tokens set `html { font-size: 18px × --text-scale }`. We override the base to **100%** (16px at the browser default, larger if the user has raised their browser font size), still multiplied by `--text-scale`. 1rem = 16px at Normal. Size everything in rem so Large and Huge reflow.
- **Switches:** `<html data-skin data-theme data-accent data-text-size data-spice>` are written by `applyAppearance()` from the settings table, in `src/app/providers.tsx`. `System` theme is resolved with `prefers-color-scheme` and follows it live.
- Local switches: `data-surface="field"` (colour-field cook mode and detail header) and `data-spice-group="1..4"` (ingredient section, mention, timer).
- The browser's `theme-color` is read from `--paper` at runtime.

## Rules

- No colour, size or font is hard-coded outside `src/design/`. Component styling lives in `src/ui/`; screens compose `src/ui` and don't style controls themselves.
- Borders are inset box-shadows. Text fields cap their radius at `min(var(--radius-md), 18px)` (the Tin skins make `--radius-md` a pill).
- Use `--accent-mark` for non-text marks (progress, pulses, rings) and `--accent-text` for accent-coloured text.
- Font utilities are `font-title`, `font-text` and `font-hand` (not `font-display` / `font-body`, which would self-reference the tokens).

Check changes at Normal and Huge, light and dark, in all five skins, at 390px and 1280px. `node scripts/shot.mjs` takes screenshots and can set any setting (`"settings":{"skin":"heirloom"}`).
