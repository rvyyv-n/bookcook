# Bookcook — screen map

R = reads, W = writes. The types come from `uploads/backend-*.ts` (Recipe, Step, Ingredient, StoryAnswer, Draft, CookLog, GroceryItem, RecipeRequest, Collection, Media, Setting, ParsedRecipe / ParsedIngredient / ParsedStep, Quantity).

| Screen | Route | Types and fields | States | Main components |
|---|---|---|---|---|
| Library (home) | `/` | R `Recipe[]` (title, author, photoIds, prepMinutes + cookMinutes, cookedCount, forkedFromId), `Collection[]`, latest `Draft`, open `RecipeRequest[]` (no fulfilledRecipeId) | empty / onboarding, search no results, loading | RecipeCard, DraftCard, RequestCard, Chip, TabBar / Sidebar |
| Recipe detail | `/r/:id` | R `Recipe` (all), `CookLog[]` by recipeId, `Media` (photoIds, originalCardPhotoIds, voiceNoteIds, story[].audioId), parent via forkedFromId. W `GroceryItem` (Add to grocery) | scaled servings, metric/imperial, transcript open/closed, no photo | StoryQuote, VoiceNotePlayer, ServingsStepper, Segmented, SectionHeading, Button |
| ★ Cook mode | `/r/:id/cook` | R `Recipe.steps` (text, timerSeconds, photoId), `Recipe.ingredients` (mentions, sheet). Timers live in client state | listening, paused, reading, timer hot/finished, last step, mic denied, dark, Huge | PinnedTimer, TimerAlert, Mention, CookControls, ListeningIndicator, Sheet + ChecklistItem |
| I made it (sheet) | `/r/:id/cook#done` | W `CookLog` {recipeId, cookedAt, rating, note, photoId}, `Media` photo, `Recipe.cookedCount`++, `lastCookedAt` | empty, rated, photo added | Sheet, rating RadioGroup, TextField |
| New recipe chooser | `/new` | W `Draft` {mode} | speech unsupported | Sheet, four choice buttons, quiet "Or just talk freely" link |
| ★ Tell it | `/new/tell/:draftId` | RW `Draft` (mode 'tell', step, progress, recipe), `ParsedIngredient`, `ParsedStep`. W `Media` audio (voice note, story) | idle, listening, processing, denied, unsupported | BigMicButton, transcript, parsed rows, TimerChip, Hands-free toggle |
| Just talk | `/new/talk/:draftId` | RW `Draft` (mode 'talk', recipe.transcript) → `ParsedRecipe` | listening, paused, done → Review | BigMicButton, elapsed timer, Done |
| ★ Type it / Edit | `/new/type/:draftId`, `/r/:id/edit` | RW `Draft` (mode 'type' \| 'edit', ingredientLines, recipeId), `ParsedIngredient` per line | draft saved, undo toast, autocomplete, parse preview | TextField + Speak, SmartIngredientLine, StepRow, UndoToast, SavedIndicator |
| Paste it | `/new/paste/:draftId` | RW `Draft` (mode 'paste') → `ParsedRecipe` | empty, tidying, error | TextField (multiline), Button "Tidy it up" |
| From a link | `/new/link/:draftId` | RW `Draft` (mode 'link') → `ParsedRecipe` (sourceUrl, imageUrl). `Recipe.source = 'web'` | loading, failure | TextField, Button |
| Review | `/new/review/:draftId` | R `Draft.recipe`. W `Recipe` (source, lang, createdAt, updatedAt). Delete the `Draft` | "Check this" rows | Editable cards, SmartIngredientLine, Button "Save recipe" |
| Grocery | `/grocery` | RW `GroceryItem[]` (name, quantity, unit, aisle, checked, fromRecipeIds, order) | empty, all checked, clear checked + undo | ChecklistItem, TextField, UndoToast |
| Requests | `/requests` | RW `RecipeRequest[]` (title, requestedBy, note, createdAt, fulfilledRecipeId). "Tell it now" → `Draft` {requestId} | empty, open, fulfilled | RequestCard, Button "Send request" (share link) |
| Settings | `/settings` | RW `Setting[]` (see keys below) | backup overdue nudge, restore | Segmented (text size with live preview), switches, Button |
| Collections · Tags | `/c/:id`, `/t/:tag` | R `Collection`, `Recipe.collectionIds`, `Recipe.tags` | empty | RecipeCard, Sidebar |
| Print cookbook | `/print` | R `Recipe[]`, `story[]`, `Media` photos, Setting `cookbookTitle` | cover, contents, recipe page, story page | Print styles (black on white) |

## Setting keys
`skin`, `theme` (light / dark / system), `accent`, `textSize`, `spiceColours`, `stepPhoto`, `readSteps`, `speakQuestions`, `speechRate`, `voice`, `name`, `defaultAuthor`, `cookbookTitle`, `lastBackupAt`.

## Derived in the UI (no new fields)
- **Spice group** = the index of `Ingredient.section` in order of first appearance, 1–4 and wrapping. Off when there are fewer than 2 sections.
- **Mentions** = ingredient names matched in `Step.text` (case-insensitive, longest match first).
- **Timer chips** = `Step.timerSeconds`, plus durations found in the text.

## Gaps in the backend types
1. **"Check this" on Review**: `ParsedIngredient` / `ParsedStep` have no confidence field. Suggest adding `needsCheck?: boolean` or `confidence?: number`.
2. **Running timers** aren't persisted, so a reload during cooking loses them. Suggest a `Setting` key `activeTimers` or local storage.
3. **Collection.emoji**: the UI uses no emoji. Leave it unrendered, or drop it.
4. **Tips voice note**: `voiceNoteIds` isn't linked to tips vs. story. Suggest `tipsAudioId?` on Recipe, or `Media.role`.
5. **Grocery merge**: "3 onions · from Biryani, Karahi" needs quantities that can be summed. `GroceryItem.quantity` is a number, but `Ingredient.quantity` may be a range (`Quantity`). Define the rule: use the upper bound, or keep the range.
6. **Why a row needs checking**: Review shows the reason ("heard 'haldi'", "two amounts in one line"). Suggest `checkReason?: string` next to `needsCheck`.
7. **Request direction**: Requests mixes recipes others want from you (Tell it now) and ones you asked for (shown under Told when fulfilled). `RecipeRequest` can't tell them apart. Suggest `direction: 'incoming' | 'outgoing'` or `askedOf?: string`.
