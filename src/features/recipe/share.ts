import { getMedia } from '../../db/media';
import type { Recipe } from '../../db/types';
import type { Locale } from '../../i18n';
import { appLinkBase } from '../../lib/platform/appUrl';
import { copyText, shareLink, type ShareResult } from '../../lib/platform/share';
import { formatIngredient } from '../../lib/parse/ingredient';
import { recipeLink } from '../../lib/shareLink';
import { metaLine } from './meta';

/**
 * The link that carries the recipe's text. A recipe told for someone's request carries that
 * request's id, so it's marked told on their side when they add it.
 */
export function recipeUrl(recipe: Recipe, requestId: string | undefined): string {
  const { origin, base } = appLinkBase();
  return recipeLink({ id: recipe.id, recipe, requestId }, origin, base);
}

/**
 * The whole recipe as plain text, readable in any message: the title and whose it is, the story,
 * the ingredients under their sections, the numbered steps and the tips.
 */
export function recipeAsText(recipe: Recipe, t: Locale): string {
  const tr = t.ui.recipe;
  const out: string[] = [recipe.title];
  const byline = [recipe.author && t.ui.common.fromKitchen(recipe.author), ...metaLine(recipe, t)].filter(Boolean).join(' · ');
  if (byline) out.push(byline);
  const story = recipe.story?.find((s) => s.answer.trim())?.answer.trim();
  if (story) out.push('', `“${story}”`);
  if (recipe.description?.trim()) out.push('', recipe.description.trim());

  if (recipe.ingredients.length) {
    out.push('', tr.ingredients.toUpperCase());
    let section: string | undefined;
    for (const ing of recipe.ingredients) {
      if (ing.section && ing.section !== section) out.push(`${ing.section}:`);
      section = ing.section;
      out.push(`• ${formatIngredient(ing)}`);
    }
  }
  const steps = recipe.steps.filter((s) => s.text.trim());
  if (steps.length) {
    out.push('', tr.steps.toUpperCase());
    steps.forEach((s, i) => out.push(`${i + 1}. ${s.text.trim()}`));
  }
  if (recipe.tips?.trim()) out.push('', tr.tips.toUpperCase(), recipe.tips.trim());
  return out.join('\n');
}

/** The recipe's first photo as a file to send with the text, or undefined if it has none. */
export async function recipePhotoFile(recipe: Recipe): Promise<File | undefined> {
  const id = recipe.photoIds[0];
  const media = id ? await getMedia(id) : undefined;
  if (!media) return undefined;
  const ext = media.mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const name = recipe.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'recipe';
  return new File([media.blob], `${name}.${ext}`, { type: media.mime });
}

/** Send a Bookcook link: the recipe opens in Bookcook with Add to my cookbook. */
export function shareRecipe(recipe: Recipe, requestId: string | undefined, t: Locale): Promise<ShareResult> {
  return shareLink({ title: recipe.title, text: t.ui.recipe.shareText(recipe.title), url: recipeUrl(recipe, requestId) });
}

/** Send as text: the whole recipe in the message (with its photo where the device can), the link after it. */
export function shareRecipeAsText(recipe: Recipe, requestId: string | undefined, t: Locale, photo?: File): Promise<ShareResult> {
  const text = `${recipeAsText(recipe, t)}\n\n${t.ui.recipe.shareTextLink}`;
  return shareLink({ title: recipe.title, text, url: recipeUrl(recipe, requestId), files: photo ? [photo] : undefined });
}

/** Copy the Bookcook link. */
export function copyRecipeLink(recipe: Recipe, requestId: string | undefined): Promise<void> {
  return copyText(recipeUrl(recipe, requestId));
}
