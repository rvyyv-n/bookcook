import type { Recipe } from '../../db/types';
import type { Locale } from '../../i18n';
import { formatMinutes } from '../../lib/format';

/** "Serves 6 · Prep 30 min · Cook 1 hr 15 min" */
export function metaLine(recipe: Recipe, t: Locale): string[] {
  const prep = formatMinutes(recipe.prepMinutes);
  const cook = formatMinutes(recipe.cookMinutes);
  return [
    recipe.servings ? t.ui.common.serves(recipe.servings) : undefined,
    prep && t.ui.recipe.prep(prep),
    cook && t.ui.recipe.cook(cook),
  ].filter((x): x is string => !!x);
}
