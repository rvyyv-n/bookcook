import { Share } from '@capacitor/share';
import { isNative } from './isNative';

export type ShareResult = 'shared' | 'copied' | 'cancelled';

/**
 * Opens the system share sheet; copies the text and link instead where there isn't one (returns
 * 'copied' then). Nothing is awaited before the share sheet opens, as Safari only allows it
 * straight from the tap.
 */
export async function shareLink(data: { title: string; text: string; url: string }): Promise<ShareResult> {
  if (isNative()) {
    try {
      await Share.share({ ...data, dialogTitle: data.title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  if (navigator.share) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(`${data.text} ${data.url}`);
  return 'copied';
}
