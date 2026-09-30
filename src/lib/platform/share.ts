import { Share } from '@capacitor/share';
import { isNative } from './isNative';

export type ShareResult = 'shared' | 'copied' | 'cancelled';

/**
 * Opens the system share sheet; copies the text and link instead where there isn't one (returns
 * 'copied' then). Nothing is awaited before the share sheet opens, as Safari only allows it
 * straight from the tap, so any `files` must be ready beforehand. Files go along where the browser
 * can share them (Safari, Chrome on Android); elsewhere, and in the Android app, the text goes alone.
 */
export async function shareLink(data: { title: string; text: string; url: string; files?: File[] }): Promise<ShareResult> {
  const { files, ...rest } = data;
  if (isNative()) {
    try {
      await Share.share({ ...rest, dialogTitle: rest.title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  if (navigator.share) {
    const withFiles = files?.length && navigator.canShare?.({ files }) ? { ...rest, files } : rest;
    try {
      await navigator.share(withFiles);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await copyText(`${rest.text} ${rest.url}`.trim());
  return 'copied';
}

/** Puts text on the clipboard. */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
