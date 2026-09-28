import type { RecipeRequest } from '../../db/types';
import type { Locale } from '../../i18n';
import { appLinkBase } from '../../lib/platform/appUrl';
import { shareLink, type ShareResult } from '../../lib/platform/share';
import { requestLink } from '../../lib/shareLink';

/** Opens the share sheet with the request's link; copies it where there isn't one. */
export function shareRequest(request: RecipeRequest, from: string, t: Locale): Promise<ShareResult> {
  const { origin, base } = appLinkBase();
  const url = requestLink({ id: request.id, title: request.title, from: from.trim() || undefined, note: request.note }, origin, base);
  return shareLink({ title: t.ui.requests.shareTitle(request.title), text: t.ui.requests.shareText(from.trim(), request.title), url });
}
