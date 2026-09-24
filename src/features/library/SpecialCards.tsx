import { Link } from 'react-aria-components';
import { deleteDraft, restoreDraft } from '../../db/drafts';
import type { Draft, RecipeRequest } from '../../db/types';
import { useT } from '../../i18n';
import { relativeTime } from '../../lib/format';
import { Button, ButtonLink } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';

export function draftHref(d: Draft): string {
  if (d.mode === 'tell') return `/new/tell?draft=${d.id}`;
  if (d.mode === 'talk') return `/new/talk?draft=${d.id}`;
  return `/new/type?draft=${d.id}`;
}

/** "Continue your draft": a paper slip at the top of the library. */
export function DraftCard({ draft }: { draft: Draft }) {
  const t = useT();
  const toast = useToast();
  const title = draft.recipe.title?.trim() || t.ui.common.untitled;
  return (
    <article className="relative flex items-center gap-4 rounded-lg border-2 border-dashed border-line-strong bg-sunk p-4 pl-5">
      <Icon name="edit" className="shrink-0 text-accent-text" />
      <div className="min-w-0 flex-1">
        <h2 className="font-body text-base font-bold">{t.ui.library.continueDraft}</h2>
        <p className="truncate text-ink-muted">{t.ui.library.draftStarted(title, relativeTime(draft.updatedAt))}</p>
      </div>
      <Button
        variant="quiet"
        onPress={async () => {
          const removed = await deleteDraft(draft.id, { keepMedia: true });
          if (removed) toast.undo(t.ui.library.draftDiscarded, () => restoreDraft(removed));
        }}
      >
        {t.ui.library.discardDraft}
      </Button>
      <ButtonLink href={draftHref(draft)} variant="primary">
        {t.ui.library.continue}
      </ButtonLink>
    </article>
  );
}

/** "Rayyan would love to learn: Nihari · Tell it" */
export function RequestCard({ request }: { request: RecipeRequest }) {
  const t = useT();
  return (
    <article className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-accent-soft p-4 pl-5">
      <Icon name="wish" className="shrink-0 text-accent-text" />
      <div className="min-w-0 flex-1">
        <p className="text-ink-muted italic">
          {request.requestedBy ? t.ui.library.wouldLove(request.requestedBy) : t.ui.library.someoneWouldLove}
        </p>
        <Link
          href={`/requests#${request.id}`}
          className="type-display text-xl font-semibold text-ink no-underline outline-none data-[focus-visible]:outline-3"
        >
          {request.title}
        </Link>
      </div>
      <ButtonLink href={`/new/tell?request=${request.id}`} variant="ink" icon="mic">
        {t.ui.library.tellIt}
      </ButtonLink>
    </article>
  );
}
