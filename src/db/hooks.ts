import { useLiveQuery } from 'dexie-react-hooks';
import { listCollections } from './collections';
import { getDraft, listDrafts } from './drafts';
import { listGrocery } from './grocery';
import { getMedia } from './media';
import { allTags, getRecipe, listCookLogs, listForks, listRecipes } from './recipes';
import { listRequests } from './requests';
import { DEFAULT_SETTINGS, getSettings, type Settings } from './settings';

/** Reactive reads for the UI. `undefined` means still loading. */
export const useRecipes = () => useLiveQuery(listRecipes);
export const useRecipe = (id: string | undefined) => useLiveQuery(() => (id ? getRecipe(id) : undefined), [id]);
export const useDrafts = () => useLiveQuery(listDrafts);
export const useDraft = (id: string | undefined) => useLiveQuery(() => (id ? getDraft(id) : undefined), [id]);
export const useGrocery = () => useLiveQuery(listGrocery);
export const useRequests = () => useLiveQuery(listRequests);
export const useCollections = () => useLiveQuery(listCollections);
export const useTags = () => useLiveQuery(allTags);
export const useCookLogs = (recipeId: string | undefined) => useLiveQuery(() => (recipeId ? listCookLogs(recipeId) : []), [recipeId]);
export const useForks = (recipeId: string | undefined) => useLiveQuery(() => (recipeId ? listForks(recipeId) : []), [recipeId]);

export function useSettings(): Settings {
  return useLiveQuery(getSettings) ?? DEFAULT_SETTINGS;
}

/** Object URLs by media id. Media is immutable, so one URL per id lives for the session. */
const urlCache = new Map<string, string>();

export function mediaUrl(id: string, blob: Blob): string {
  let url = urlCache.get(id);
  if (!url) {
    url = URL.createObjectURL(blob);
    urlCache.set(id, url);
  }
  return url;
}

/** An object URL for a stored photo or recording. */
export function useMediaUrl(id: string | undefined): string | undefined {
  const cached = id ? urlCache.get(id) : undefined;
  const media = useLiveQuery(() => (id && !cached ? getMedia(id) : undefined), [id, cached]);
  if (cached) return cached;
  return media && id ? mediaUrl(id, media.blob) : undefined;
}
