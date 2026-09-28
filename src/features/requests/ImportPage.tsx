import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { addRequest, getRequest } from '../../db/requests';
import { useT } from '../../i18n';
import { readRequestLink, type SharedRequest } from '../../lib/shareLink';
import { Button, ButtonLink } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useTellIt } from '../library/SpecialCards';

/** Keeps a request from a link, once (the sender's id is reused, so a second open changes nothing). */
async function keep(shared: SharedRequest): Promise<void> {
  if (await getRequest(shared.id)) return;
  await addRequest({
    id: shared.id,
    title: shared.title,
    direction: 'incoming',
    ...(shared.from ? { requestedBy: shared.from } : {}),
    ...(shared.note ? { note: shared.note } : {}),
  });
}

/** `/import#request=…`: someone would love to learn a recipe from you. */
export function ImportPage() {
  const t = useT();
  const tr = t.ui.requests;
  const { hash } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const tellIt = useTellIt();
  const [busy, setBusy] = useState(false);
  const shared = readRequestLink(hash);

  if (!shared)
    return (
      <div className="flex max-w-xl flex-col items-start gap-4 py-10">
        <h1 className="text-3xl leading-none">{tr.incomingTitle}</h1>
        <p className="text-lg">{tr.badLink}</p>
        <ButtonLink href="/" variant="primary" icon="cookbook">
          {t.ui.common.goHome}
        </ButtonLink>
      </div>
    );

  return (
    <div className="flex max-w-xl flex-col gap-5 py-6 desk:py-10">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{tr.incomingTitle}</h1>
      <article className="flex flex-col gap-2.5 rounded-lg bg-accent-soft p-4.5">
        <p>
          {shared.from ? (
            <>
              <i className="type-display">{shared.from}</i> {tr.wouldLove}
            </>
          ) : (
            tr.incomingSomeone
          )}
        </p>
        <h2 className="type-display text-2xl leading-[1.05]">{shared.title}</h2>
        {shared.note && <p className="text-ink-muted">“{shared.note}”</p>}
      </article>
      <p className="text-ink-muted">{tr.incomingBody}</p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="primary"
          icon="mic"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            await keep(shared);
            await tellIt(shared.title, shared.id);
          }}
        >
          {tr.tellItNow}
        </Button>
        <Button
          variant="secondary"
          icon="requests"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            await keep(shared);
            toast.show({ message: tr.added, tone: 'success' });
            navigate('/requests', { replace: true });
          }}
        >
          {tr.addToRequests}
        </Button>
      </div>
    </div>
  );
}
