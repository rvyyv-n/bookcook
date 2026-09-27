# Decisions on the design handoff

The other files in this folder are copied verbatim from the design handoff. The full package (the HTML prototypes, the stock photo and the screenshots) stays local in `design_handoff/`, which is gitignored: the photo is watermarked stock and must never be pushed. Paths in the copied docs such as `design/*.dc.html` and `screenshots/` refer to that local folder.

## Design

- **`src/design` is adopted unchanged.** `tokens.css`, `theme.css`, `skin.ts` and `icons.ts` are byte-identical to the handoff, and the app adapts to them.
- **Folder layout stays ours** (`src/db`, `src/lib/parse`, `src/features/*`), not the handoff's suggested `src/data`.
- **Base text size is `112.5%`**, not the tokens' fixed `18px`, so the browser's font-size setting still applies. It's set in `src/styles/index.css` and still multiplied by `--text-scale`.
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
