import type { RecipeRequest } from '../../db/types';
import type { Locale } from '../../i18n';
import { requestLink } from '../../lib/shareLink';

/** Opens the share sheet with the request's link; copies it where there isn't one. */
export async function shareRequest(request: RecipeRequest, from: string, t: Locale): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = requestLink(
    { id: request.id, title: request.title, from: from.trim() || undefined, note: request.note },
    location.origin,
    import.meta.env.BASE_URL,
  );
  const text = t.ui.requests.shareText(from.trim(), request.title);
  if (navigator.share) {
    try {
      await navigator.share({ title: t.ui.requests.shareTitle(request.title), text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}
