import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { deleteDraft, getDraft, patchDraft } from '../../db/drafts';
import { useDraft } from '../../db/hooks';
import { useT } from '../../i18n';
import { importFromLink, normaliseUrl } from '../../lib/importLink';
import { Button } from '../../ui/Button';
import { LinkFailed, LinkLoading } from '../../ui/Capture';
import { TextField } from '../../ui/Field';
import { draftFromParsed, isBlankDraft } from '../editor/model';
import { useLeave } from './NewRecipe';

type Phase = 'idle' | 'loading' | 'failed';

/**
 * `/new/link/:draftId`: a web address, Get recipe, then Check your recipe. The page is read by the
 * import function; when there's no recipe on it (or it can't be read) the failure points to Paste it.
 */
export function FromLinkPage() {
  const { draftId } = useParams();
  const t = useT();
  const l = t.ui.link;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const leave = useLeave();
  const draft = useDraft(draftId);
  const [typed, setTyped] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const value = typed ?? (typeof draft?.progress?.url === 'string' ? draft.progress.url : '');

  const live = useRef({ value, done: false });
  useEffect(() => {
    live.current.value = value;
  });
  const aborter = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    const state = live.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      aborter.current?.abort();
      if (!draftId || state.done) return;
      if (state.value.trim()) return void patchDraft(draftId, { progress: { url: state.value } });
      // Only once the page has really gone: a remount (StrictMode) comes straight back.
      setTimeout(() => {
        if (mounted.current) return;
        void getDraft(draftId).then((d) => {
          if (d && d.mode === 'link' && isBlankDraft(d.recipe, d.ingredientLines ?? [])) void deleteDraft(d.id);
        });
      });
    };
  }, [draftId]);

  async function get() {
    if (!draftId || phase === 'loading') return;
    const url = normaliseUrl(value);
    if (!url) return setError(l.badUrl);
    setError(undefined);
    setPhase('loading');
    const controller = new AbortController();
    aborter.current = controller;
    let recipe;
    try {
      recipe = await importFromLink(url, controller.signal);
    } catch {
      return;
    }
    if (!recipe) return setPhase('failed');
    const current = await getDraft(draftId);
    await patchDraft(draftId, {
      recipe: { ...current?.recipe, ...draftFromParsed(recipe), sourceUrl: url, source: 'web' },
      ingredientLines: undefined,
      step: 'review',
      progress: { url },
    });
    live.current.done = true;
    navigate(`/new/review/${draftId}`);
  }

  async function pasteInstead() {
    if (!draftId) return;
    live.current.done = true;
    await patchDraft(draftId, { mode: 'paste', progress: undefined });
    navigate(`/new/paste/${draftId}`, { replace: true });
  }

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;

  const field = (
    <TextField
      label={l.label}
      type="url"
      inputMode="url"
      autoComplete="url"
      placeholder={l.placeholder}
      value={value}
      onChange={(v) => {
        setTyped(v);
        setError(undefined);
      }}
      onKeyDown={(e) => e.key === 'Enter' && void get()}
      isDisabled={phase === 'loading'}
      isInvalid={!!error}
      errorMessage={error}
      dictate={false}
    />
  );
  const status =
    phase === 'loading' ? (
      <LinkLoading>{l.reading}</LinkLoading>
    ) : phase === 'failed' ? (
      <LinkFailed title={l.failed} body={l.failedBody} action={l.pasteIt} onAction={() => void pasteInstead()} />
    ) : null;
  const cta = (
    <Button
      variant="primary"
      size="XL"
      icon={phase === 'failed' ? 'retry' : 'download'}
      isDisabled={!value.trim() || phase === 'loading'}
      onPress={() => void get()}
      className={desktop ? undefined : 'w-full'}
    >
      {phase === 'failed' ? l.tryAgain : l.get}
    </Button>
  );

  if (desktop)
    return (
      <div className="flex min-h-full max-w-[860px] flex-col gap-4.5 px-16 py-10">
        <h1 className="text-3xl leading-[1.05] tracking-[-0.02em]">{l.title}</h1>
        <p className="text-lg text-ink-muted">{l.helper}</p>
        {field}
        {status}
        <div className="flex justify-end">{cta}</div>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2">
        <Button variant="quiet" icon="back" onPress={leave} className="px-[.8rem]">
          {t.ui.common.back}
        </Button>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-6">
        <h1 className="text-2xl leading-[1.1] tracking-[-0.015em]">{l.title}</h1>
        <p className="text-ink-muted">{l.helper}</p>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-5.5">
        {field}
        {status}
      </div>
      <div className="mt-auto px-4 pt-6 pb-[max(1.125rem,env(safe-area-inset-bottom))]">{cta}</div>
    </div>
  );
}
