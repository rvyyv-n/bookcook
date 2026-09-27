import { Link } from 'react-aria-components';
import { useNavigate } from 'react-router';
import { createDraft } from '../../db/drafts';
import type { Draft, RecipeRequest } from '../../db/types';
import { useT } from '../../i18n';
import { relativeTime } from '../../lib/format';
import { Button, ButtonLink } from '../../ui/Button';

export function draftHref(d: Draft): string {
  if (d.mode === 'edit') return `/r/${d.recipeId}/edit`;
  return `/new/${d.mode}/${d.id}`;
}

/** Starts a Tell it draft for a request, then opens it. */
export function useTellIt() {
  const navigate = useNavigate();
  return async (title: string, requestId?: string) => {
    const draft = await createDraft('tell', { title }, requestId ? { requestId } : {});
    navigate(draftHref(draft));
  };
}

const display = 'type-display text-xl leading-[1.1]';

/** "Continue your draft": on --sunk, with one ink Continue. */
export function DraftCard({ draft }: { draft: Draft }) {
  const t = useT();
  return (
    <article className="flex flex-col items-start gap-2 rounded-lg bg-sunk p-4.5">
      <h2 className="font-text text-base font-bold text-ink-muted">{t.ui.library.continueDraft}</h2>
      <p className={display}>{draft.recipe.title?.trim() || t.ui.common.untitled}</p>
      <p className="text-ink-muted">{t.ui.library.draftStarted(relativeTime(draft.updatedAt))}</p>
      <ButtonLink href={draftHref(draft)} variant="ink" className="px-[1.2rem]">
        {t.ui.library.continue}
      </ButtonLink>
    </article>
  );
}

function Asker({ request }: { request: RecipeRequest }) {
  const t = useT();
  return <i className="type-display">{request.requestedBy || t.ui.library.someone}</i>;
}

/** "Rayyan would love to learn / Nihari / Tell it", on --accent-soft. */
export function RequestCard({ request }: { request: RecipeRequest }) {
  const t = useT();
  const tellIt = useTellIt();
  return (
    <article className="flex flex-col items-start gap-2 rounded-lg bg-accent-soft p-4.5">
      <p>
        <Asker request={request} /> {t.ui.library.wouldLove}
      </p>
      <h2 className={display}>{request.title}</h2>
      <Button variant="primary" icon="mic" className="pr-[1.2rem] pl-[.9rem]" onPress={() => tellIt(request.title, request.id)}>
        {t.ui.library.tellIt}
      </Button>
    </article>
  );
}

/** Desktop list pane: the request and the draft share one small card. */
export function DeskPromptCard({ request, draft }: { request?: RecipeRequest; draft?: Draft }) {
  const t = useT();
  const tellIt = useTellIt();
  if (!request && !draft) return null;
  const draftLine = draft && (
    <span className="text-[0.8333rem] text-ink-muted">
      {t.ui.library.draftLine} {draft.recipe.title?.trim() || t.ui.common.untitled} ·{' '}
      <Link href={draftHref(draft)} className="font-bold text-accent-text underline underline-offset-2">
        {t.ui.library.continue}
      </Link>
    </span>
  );
  if (!request)
    return (
      <div className="mx-5 my-1.5 flex flex-col gap-1 rounded-[min(var(--radius-md),18px)] bg-sunk px-3.5 py-3">
        <span className="font-bold">{t.ui.library.continueDraft}</span>
        {draftLine}
      </div>
    );
  return (
    <div className="mx-5 my-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-[min(var(--radius-md),18px)] bg-accent-soft px-3.5 py-3">
      <span>
        <Asker request={request} /> {t.ui.library.wouldLove} <b>{request.title}</b>
      </span>
      <Button variant="primary" icon="mic" className="row-span-2 gap-1 pr-4 pl-[.7rem]" onPress={() => tellIt(request.title, request.id)}>
        {t.ui.library.tellIt}
      </Button>
      {draftLine}
    </div>
  );
}
