import { redirect } from 'react-router';
import { countDrafts } from '../../db/drafts';
import { countRecipes } from '../../db/recipes';
import { getSetting, setSetting } from '../../db/settings';

/**
 * What the first visit to `/` does:
 * - `welcome`: nothing has been done here yet, so show the welcome.
 * - `mark`: there are recipes or drafts already (an app in use before the welcome existed, or a
 *   restored backup), so note it as seen without showing it.
 * - `none`: already seen.
 */
export function shouldOnboard(onboarded: boolean, recipeCount: number, draftCount: number): 'welcome' | 'mark' | 'none' {
  if (onboarded) return 'none';
  return recipeCount > 0 || draftCount > 0 ? 'mark' : 'welcome';
}

/**
 * The route loader for `/`. It runs before anything is drawn, so the cookbook never flashes ahead
 * of the welcome. Deep links (`/import#…`, `/r/:id`) never reach it.
 */
export async function firstRunLoader() {
  const [onboarded, recipes, drafts] = await Promise.all([getSetting('onboarded'), countRecipes(), countDrafts()]);
  const verdict = shouldOnboard(onboarded, recipes, drafts);
  if (verdict === 'welcome') return redirect('/welcome');
  if (verdict === 'mark') await setSetting('onboarded', true);
  return null;
}
