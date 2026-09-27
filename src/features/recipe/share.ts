import type { Recipe } from '../../db/types';
import { formatIngredient } from '../../lib/parse/ingredient';

/** The recipe as plain text, for sharing in a message: title, ingredients, numbered steps, tips. */
export function recipeAsText(recipe: Recipe): string {
  const lines = [recipe.title, ''];
  let section: string | undefined;
  for (const i of recipe.ingredients) {
    if (i.section && i.section !== section) lines.push('', i.section);
    section = i.section;
    lines.push(`• ${formatIngredient(i)}`);
  }
  if (recipe.steps.length) lines.push('');
  recipe.steps.forEach((s, n) => lines.push(`${n + 1}. ${s.text}`));
  if (recipe.tips) lines.push('', recipe.tips);
  return lines.join('\n').trim();
}

/** Opens the system share sheet with the recipe text; copies it instead where there isn't one. Returns 'copied' then. */
export async function shareRecipe(recipe: Recipe): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = recipeAsText(recipe);
  if (navigator.share) {
    try {
      await navigator.share({ title: recipe.title, text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
