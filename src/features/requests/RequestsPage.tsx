import { useState, type ReactNode } from 'react';
import { Form, Link } from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { useDrafts, useRecipes, useRequests, useSettings } from '../../db/hooks';
import { addRequest, deleteRequest, restoreRequest } from '../../db/requests';
import { setSetting } from '../../db/settings';
import type { Draft, RecipeRequest } from '../../db/types';
import { useT } from '../../i18n';
import { relativeTime } from '../../lib/format';
import { Button, ButtonLink } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { TextField } from '../../ui/Field';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { draftHref, useTellIt } from '../library/SpecialCards';
import { shareRequest } from './share';

const cardClass = 'flex flex-col items-start gap-2.5 rounded-lg bg-surface p-4.5 shadow-paper desk:p-5';
const titleClass = 'type-display text-xl leading-[1.1] desk:text-2xl desk:leading-[1.05]';
const gridClass = 'grid gap-2.5 desk:grid-cols-3 desk:gap-4.5';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading text-lg">
        {title}
      </h2>
      <ul className={gridClass}>{children}</ul>
    </section>
  );
}

function RemoveButton({ request }: { request: RecipeRequest }) {
  const t = useT();
  const toast = useToast();
  return (
    <Button
      variant="quiet"
      aria-label={t.ui.requests.removeNamed(request.title)}
      onPress={async () => {
        const snap = await deleteRequest(request.id);
        if (snap) toast.undo(t.ui.requests.removed(request.title), () => restoreRequest(snap));
      }}
    >
      {t.ui.requests.remove}
    </Button>
  );
}

/** Someone wants this from you: "Sam would love to learn · 3 days ago", then Tell it now (or Continue a draft). */
function IncomingCard({ request, draft }: { request: RecipeRequest; draft?: Draft }) {
  const t = useT();
  const tr = t.ui.requests;
  const tellIt = useTellIt();
  return (
    <li className={cardClass}>
      <p>
        <i className="type-display">{request.requestedBy || tr.someone}</i> {tr.wouldLove} · {relativeTime(request.createdAt)}
      </p>
      <h3 className={titleClass}>{request.title}</h3>
      {request.note && <p className="text-ink-muted">“{request.note}”</p>}
      {draft && (
        <p className="flex items-center gap-1.5 text-ink-muted">
          <Icon name="draft" size="1.2rem" className="shrink-0" />
          {tr.draftStarted(relativeTime(draft.updatedAt))}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {draft ? (
          <ButtonLink href={draftHref(draft)} variant="secondary" className="px-[1.2rem]">
            {tr.continue}
          </ButtonLink>
        ) : (
          <Button variant="ink" icon="mic" className="pr-[1.2rem] pl-[.9rem]" onPress={() => tellIt(request.title, request.id)}>
            {tr.tellItNow}
          </Button>
        )}
        <RemoveButton request={request} />
      </div>
    </li>
  );
}

/** You asked someone: "You asked Nani · 2 weeks ago", with Send again. */
function OutgoingCard({ request }: { request: RecipeRequest }) {
  const t = useT();
  const tr = t.ui.requests;
  const toast = useToast();
  const { myName } = useSettings();
  return (
    <li className={cardClass}>
      <p>
        {request.askedOf ? (
          <>
            {tr.youAsked} <i className="type-display">{request.askedOf}</i>
          </>
        ) : (
          tr.youAsked
        )}{' '}
        · {relativeTime(request.createdAt)}
      </p>
      <h3 className={titleClass}>{request.title}</h3>
      {request.note && <p className="text-ink-muted">“{request.note}”</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button
          variant="secondary"
          icon="send"
          onPress={async () => {
            if ((await shareRequest(request, myName, t)) === 'copied') toast.show({ message: tr.linkCopied, tone: 'success' });
          }}
        >
          {tr.sendAgain}
        </Button>
        <RemoveButton request={request} />
      </div>
    </li>
  );
}

/** "Grandma's Banana Bread · Nani told it. It's in your cookbook." on --success-soft. */
function ToldCard({ request, recipeTitle }: { request: RecipeRequest; recipeTitle?: string }) {
  const t = useT();
  const tr = t.ui.requests;
  const teller = request.direction === 'outgoing' ? request.askedOf : undefined;
  const body = (
    <>
      <span aria-hidden className="grid size-[3.2rem] shrink-0 place-items-center rounded-full bg-success text-paper">
        <Icon name="madeIt" size="1.7rem" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <b className={cx('type-display text-lg leading-[1.1]', 'desk:text-2xl desk:leading-[1.05]')}>{recipeTitle ?? request.title}</b>
        <span>{teller ? tr.toldBy(teller) : tr.youTold}</span>
      </span>
    </>
  );
  const cls =
    'grid grid-cols-[3.2rem_minmax(0,1fr)] items-center gap-3.5 rounded-lg bg-success-soft px-4.5 py-4 text-ink no-underline desk:flex desk:flex-col desk:items-start desk:gap-2.5 desk:p-5';
  return (
    <li>
      {recipeTitle && request.fulfilledRecipeId ? (
        <Link href={`/r/${request.fulfilledRecipeId}`} className={cx(cls, 'h-full data-[hovered]:shadow-paper')}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

/** Send request: the dish, who you're asking and a note, then the share sheet with a link. */
function SendRequestSheet({
  isOpen,
  onOpenChange,
  initialTitle,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
}) {
  const t = useT();
  const tr = t.ui.requests;
  const toast = useToast();
  const settings = useSettings();
  const [title, setTitle] = useState(initialTitle);
  const [askedOf, setAskedOf] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState(settings.myName);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsName = !settings.myName;

  async function send() {
    if (!title.trim()) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    const from = name.trim();
    if (needsName && from) await setSetting('myName', from);
    const request = await addRequest({
      title,
      direction: 'outgoing',
      ...(askedOf.trim() ? { askedOf: askedOf.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    const how = await shareRequest(request, from, t);
    setBusy(false);
    onOpenChange(false);
    toast.show({ message: how === 'copied' ? tr.linkCopied : tr.sent, tone: 'success' });
  }

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={tr.sheetTitle}
      description={tr.sheetDescription}
      footer={
        <Button type="submit" form="send-request" variant="primary" icon="send" className="w-full" isDisabled={busy}>
          {tr.send}
        </Button>
      }
    >
      <Form
        id="send-request"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <TextField
          label={tr.dish}
          placeholder={tr.dishPlaceholder}
          value={title}
          onChange={(v) => {
            setTitle(v);
            setInvalid(false);
          }}
          isInvalid={invalid}
          errorMessage={tr.dishMissing}
          autoFocus
        />
        <TextField label={tr.askWho} placeholder={tr.askWhoPlaceholder} value={askedOf} onChange={setAskedOf} />
        <TextField label={tr.note} placeholder={tr.notePlaceholder} value={note} onChange={setNote} multiline rows={2} />
        {needsName && <TextField label={tr.yourName} description={tr.yourNameHint} value={name} onChange={setName} />}
      </Form>
    </Sheet>
  );
}

export function RequestsPage() {
  const t = useT();
  const tr = t.ui.requests;
  const requests = useRequests();
  const drafts = useDrafts();
  const recipes = useRecipes();
  // "Ask for it" on a search with no results opens the sheet with the search filled in.
  const [params, setParams] = useSearchParams();
  const ask = params.get('ask');
  const [sheet, setSheet] = useState<{ title: string } | null>(ask !== null ? { title: ask } : null);
  if (!requests || !drafts || !recipes) return null;

  const titles = new Map(recipes.map((r) => [r.id, r.title]));
  const told = requests.filter((r) => r.fulfilledRecipeId);
  const open = requests.filter((r) => !r.fulfilledRecipeId);
  const incoming = open.filter((r) => r.direction === 'incoming');
  const outgoing = open.filter((r) => r.direction === 'outgoing');
  const draftFor = (id: string) => drafts.find((d) => d.requestId === id);

  const openSheet = () => setSheet({ title: '' });
  const closeSheet = (isOpen: boolean) => {
    if (isOpen) return;
    setSheet(null);
    if (ask !== null) setParams({}, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6.5 desk:gap-7">
      <header className="flex flex-col gap-3 pt-2 desk:flex-row desk:items-end desk:gap-4">
        <div className="flex flex-col gap-3 desk:gap-1.5">
          <h1 className="text-3xl leading-none tracking-[-0.02em]">{tr.title}</h1>
          <p className="text-ink-muted desk:hidden">{tr.intro}</p>
          <p className="hidden text-ink-muted desk:block">{tr.introShort}</p>
        </div>
        <Button
          variant="primary"
          icon="send"
          className="w-full desk:ml-auto desk:w-auto desk:pr-[1.4rem] desk:pl-[1.1rem]"
          onPress={openSheet}
        >
          {tr.sendRequest}
        </Button>
      </header>

      {!requests.length && (
        <div className="flex flex-col gap-3 px-2 py-10">
          <p className="type-eyebrow text-lg text-accent-text">{tr.emptyEyebrow}</p>
          <p className="type-display text-2xl leading-[1.1] text-balance">{tr.emptyTitle}</p>
        </div>
      )}
      {incoming.length > 0 && (
        <Section id="req-waiting" title={tr.waiting}>
          {incoming.map((r) => (
            <IncomingCard key={r.id} request={r} draft={draftFor(r.id)} />
          ))}
        </Section>
      )}
      {outgoing.length > 0 && (
        <Section id="req-asked" title={tr.youAsked}>
          {outgoing.map((r) => (
            <OutgoingCard key={r.id} request={r} />
          ))}
        </Section>
      )}
      {told.length > 0 && (
        <Section id="req-told" title={tr.told}>
          {told.map((r) => (
            <ToldCard key={r.id} request={r} recipeTitle={r.fulfilledRecipeId ? titles.get(r.fulfilledRecipeId) : undefined} />
          ))}
        </Section>
      )}

      {sheet && <SendRequestSheet isOpen onOpenChange={closeSheet} initialTitle={sheet.title} />}
    </div>
  );
}
