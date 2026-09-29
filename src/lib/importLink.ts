import { CapacitorHttp } from '@capacitor/core';
import { recipeFromHtml } from './parse/schemaOrg';
import type { ParsedRecipe } from './parse/types';
import { isDesktopApp, isNative } from './platform/isNative';

/**
 * Where the From a link function lives: `VITE_IMPORT_URL` when set (a function deployed elsewhere),
 * otherwise `/api/import` beside the app (Cloudflare Pages, `functions/api/import.ts`).
 */
const ENDPOINT: string = import.meta.env.VITE_IMPORT_URL || `${import.meta.env.BASE_URL}api/import`;

/** "recipesite.com/x" → "https://recipesite.com/x". Undefined when it isn't a web address. */
export function normaliseUrl(raw: string): string | undefined {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.')) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** The Windows app has no function beside it, so it asks the live app's (which allows any origin). */
const LIVE_ENDPOINT = 'https://bookcook.pages.dev/api/import';

async function viaFunction(url: string, signal?: AbortSignal): Promise<ParsedRecipe | undefined> {
  const res = await fetch(`${isDesktopApp() ? LIVE_ENDPOINT : ENDPOINT}?url=${encodeURIComponent(url)}`, { signal });
  if (!res.headers.get('content-type')?.includes('json')) return undefined; // no function here (GitHub Pages)
  const body = (await res.json()) as { recipe?: ParsedRecipe };
  return body.recipe;
}

/** A few sites allow reading their pages from anywhere (CORS). */
async function direct(url: string, signal?: AbortSignal): Promise<ParsedRecipe | undefined> {
  const res = await fetch(url, { signal, mode: 'cors', credentials: 'omit' });
  if (!res.ok) return undefined;
  return recipeFromHtml(await res.text(), url);
}

/** In the Android app: the page itself, over native HTTP, which no site's CORS rules apply to. */
async function native(url: string): Promise<ParsedRecipe | undefined> {
  const res = await CapacitorHttp.get({
    url,
    responseType: 'text',
    connectTimeout: 10_000,
    readTimeout: 10_000,
    headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'Mozilla/5.0 (compatible; Bookcook recipe import)' },
  });
  if (res.status < 200 || res.status >= 300 || typeof res.data !== 'string') return undefined;
  return recipeFromHtml(res.data, res.url || url);
}

/** The recipe on a web page, or undefined when it can't be read (so the page can point to Paste it). */
export async function importFromLink(url: string, signal?: AbortSignal): Promise<ParsedRecipe | undefined> {
  for (const attempt of isNative() ? [native] : [viaFunction, direct]) {
    try {
      const recipe = await attempt(url, signal);
      signal?.throwIfAborted();
      if (recipe && (recipe.ingredients.length || recipe.steps.length)) return recipe;
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  return undefined;
}
