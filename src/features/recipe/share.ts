import type { Recipe } from '../../db/types';
import type { Locale } from '../../i18n';
import { recipeLink } from '../../lib/shareLink';

/**
 * Opens the system share sheet with a link to the recipe; copies it instead where there isn't one
 * (returns 'copied' then). A recipe told for someone's request carries that request's id, so it's
 * marked told on their side when they add it. Nothing is awaited before the share sheet opens, as
 * Safari only allows it straight from the tap.
 */
export async function shareRecipe(recipe: Recipe, requestId: string | undefined, t: Locale): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = recipeLink({ id: recipe.id, recipe, requestId }, location.origin, import.meta.env.BASE_URL);
  const text = t.ui.recipe.shareText(recipe.title);
  if (navigator.share) {
    try {
      await navigator.share({ title: recipe.title, text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}
