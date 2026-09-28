import { useLiveQuery } from 'dexie-react-hooks';
import { listCollections } from './collections';
import { getDraft, listDrafts } from './drafts';
import { listGrocery } from './grocery';
import { getMedia } from './media';
import { allTags, getRecipe, listCookLogs, listForks, listRecipes } from './recipes';
import { listRequests, requestAnsweredBy } from './requests';
import { DEFAULT_SETTINGS, getSettings, type Settings } from './settings';

/** Reactive reads for the UI. `undefined` means still loading. */
export const useRecipes = () => useLiveQuery(listRecipes);
/** `undefined` while loading, `null` when there is no such recipe. */
export const useRecipe = (id: string | undefined) => useLiveQuery(async () => (id ? ((await getRecipe(id)) ?? null) : null), [id]);
export const useDrafts = () => useLiveQuery(listDrafts);
export const useDraft = (id: string | undefined) => useLiveQuery(async () => (id ? ((await getDraft(id)) ?? null) : null), [id]);
export const useGrocery = () => useLiveQuery(listGrocery);
export const useRequests = () => useLiveQuery(listRequests);
/** The request someone sent you that a recipe answers; `null` when there isn't one. */
export const useRequestAnsweredBy = (recipeId: string) => useLiveQuery(async () => (await requestAnsweredBy(recipeId)) ?? null, [recipeId]);
export const useCollections = () => useLiveQuery(listCollections);
export const useTags = () => useLiveQuery(allTags);
export const useCookLogs = (recipeId: string | undefined) => useLiveQuery(() => (recipeId ? listCookLogs(recipeId) : []), [recipeId]);
export const useForks = (recipeId: string | undefined) => useLiveQuery(() => (recipeId ? listForks(recipeId) : []), [recipeId]);

export function useSettings(): Settings {
  return useLiveQuery(getSettings) ?? DEFAULT_SETTINGS;
}

/** Object URLs by media id. Media is immutable, so one URL per id lives for the session. */
const urlCache = new Map<string, string>();
/** URLs of SVG pictures (the example recipes' pixel art), which scale to fit instead of cropping. */
const vectorUrls = new Set<string>();

export function mediaUrl(id: string, blob: Blob): string {
  let url = urlCache.get(id);
  if (!url) {
    url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    if (blob.type === 'image/svg+xml') vectorUrls.add(url);
  }
  return url;
}

export const isVectorUrl = (url: string) => vectorUrls.has(url);

/** An object URL for a stored photo or recording. */
export function useMediaUrl(id: string | undefined): string | undefined {
  const cached = id ? urlCache.get(id) : undefined;
  const media = useLiveQuery(() => (id && !cached ? getMedia(id) : undefined), [id, cached]);
  if (cached) return cached;
  return media && id ? mediaUrl(id, media.blob) : undefined;
}
