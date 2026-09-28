import type { Recipe } from '../../db/types';
import type { Locale } from '../../i18n';
import { appLinkBase } from '../../lib/platform/appUrl';
import { shareLink, type ShareResult } from '../../lib/platform/share';
import { recipeLink } from '../../lib/shareLink';

/**
 * Shares a link to the recipe, or copies it where there's no share sheet. A recipe told for
 * someone's request carries that request's id, so it's marked told on their side when they add it.
 */
export function shareRecipe(recipe: Recipe, requestId: string | undefined, t: Locale): Promise<ShareResult> {
  const { origin, base } = appLinkBase();
  const url = recipeLink({ id: recipe.id, recipe, requestId }, origin, base);
  return shareLink({ title: recipe.title, text: t.ui.recipe.shareText(recipe.title), url });
}
