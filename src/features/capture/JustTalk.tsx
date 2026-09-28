import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { deleteDraft, getDraft, patchDraft } from '../../db/drafts';
import type { Draft } from '../../db/types';
import { useT } from '../../i18n';
import { parseMonologue } from '../../lib/parse/classify';
import { formatClock } from '../../lib/parse/timers';
import { Button } from '../../ui/Button';
import { Working } from '../../ui/Capture';
import { BigMicButton, Elapsed, HeardTranscript, MicBlocked, NoSpeech, type MicState } from '../../ui/Mic';
import { useToast } from '../../ui/Toast';
import { draftFromParsed } from '../editor/model';
import { useLeave } from './NewRecipe';
import { useListen } from './useListen';
import { useMicCopy } from './micCopy';

/** How long "Sorting it out…" stays up at least, so it reads as a step rather than a flash. */
const SORT_MS = 500;

/**
 * `/new/talk/:draftId`: free talk while cooking. The mic listens through pauses; everything heard
 * is kept as the transcript ("In her words"). Done sorts it into ingredients and steps and opens
 * Check your recipe. A rough draft by design: Tell it is the reliable way.
 */
export function JustTalkPage() {
  const { draftId } = useParams();
  const t = useT();
  const k = t.ui.talk;
  const c = t.ui.capture;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();
  const leave = useLeave();

  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [transcript, setTranscript] = useState('');
  const [sorting, setSorting] = useState(false);
  // Talking time: what was saved before, plus the current stretch of listening.
  const [elapsed, setElapsed] = useState(0);
  const since = useRef<number | undefined>(undefined);
  const live = useRef({ transcript: '', elapsed: 0 });

  useEffect(() => {
    if (!draftId) return;
    let alive = true;
    void getDraft(draftId).then((d) => {
      if (!alive) return;
      setDraft(d ?? null);
      const text = d?.recipe.transcript ?? '';
      const secs = typeof d?.progress?.elapsed === 'number' ? d.progress.elapsed : 0;
      live.current = { transcript: text, elapsed: secs };
      setTranscript(text);
      setElapsed(secs);
    });
    return () => {
      alive = false;
    };
  }, [draftId]);

  const talked = () => live.current.elapsed + (since.current ? (Date.now() - since.current) / 1000 : 0);

  const save = useCallback(() => {
    if (!draftId) return;
    const { transcript: text } = live.current;
    return patchDraft(draftId, { recipe: { ...draft?.recipe, transcript: text }, progress: { elapsed: talked() } });
    // `talked` reads refs only.
  }, [draftId, draft]);

  const micCopy = useMicCopy();
  const listen = useListen({
    onFinal: (text) => {
      const next = live.current.transcript ? `${live.current.transcript} ${text.trim()}` : text.trim();
      live.current.transcript = next;
      setTranscript(next);
      void save();
    },
    onError: (e) => e === 'network' && toast.show({ message: c.offline, timeout: 8000 }),
  });

  // The clock runs while listening.
  useEffect(() => {
    if (listen.status !== 'listening') {
      if (since.current) {
        live.current.elapsed = talked();
        since.current = undefined;
        setElapsed(live.current.elapsed);
        void save();
      }
      return;
    }
    since.current = Date.now();
    const id = setInterval(() => setElapsed(talked()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen.status]);

  // Start listening straight away: choosing Just talk is the tap that starts it.
  const started = useRef(false);
  useEffect(() => {
    if (draft && !started.current) {
      started.current = true;
      listen.start(true);
    }
  }, [draft, listen]);

  function toggle() {
    if (listen.listening) listen.stop();
    else listen.start(true);
  }

  async function done() {
    if (!draftId || sorting) return;
    listen.stop();
    const text = live.current.transcript.trim();
    if (!text) return void toast.show({ message: k.nothingHeard });
    setSorting(true);
    const parsed = parseMonologue(text);
    await new Promise((r) => setTimeout(r, SORT_MS));
    if (!parsed.ingredients.length && !parsed.steps.length) {
      setSorting(false);
      return void toast.show({ message: k.nothingFound, timeout: 8000 });
    }
    const current = await getDraft(draftId);
    await patchDraft(draftId, {
      recipe: { ...current?.recipe, ...draftFromParsed({ ...parsed }), transcript: text },
      ingredientLines: undefined,
      step: 'review',
      progress: { elapsed: talked() },
    });
    navigate(`/new/review/${draftId}`, { replace: true });
  }

  async function typeInstead() {
    if (!draftId) return;
    listen.stop();
    const text = live.current.transcript.trim();
    const parsed = text ? parseMonologue(text) : { ingredients: [], steps: [] };
    await patchDraft(draftId, { mode: 'type', recipe: { ...draft?.recipe, ...draftFromParsed(parsed), transcript: text || undefined } });
    navigate(`/new/type/${draftId}`, { replace: true });
  }

  async function exit() {
    listen.stop();
    if (draftId) {
      if (!live.current.transcript.trim()) await deleteDraft(draftId);
      else await save();
    }
    leave();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, button, a, [role="dialog"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape') void exit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;
  if (draft === undefined) return null;

  const paused = listen.status === 'idle' && (!!transcript || elapsed > 0);
  const micState: MicState = listen.status === 'processing' ? 'processing' : listen.listening ? 'listening' : 'idle';
  const micLabel = micState === 'processing' ? c.writing : micState === 'listening' ? k.listening : paused ? k.paused : k.tapToTalk;
  const micAria = micState === 'listening' ? k.micPause : paused ? k.micResume : k.micStart;

  const mic =
    listen.status === 'denied' ? (
      <MicBlocked
        title={c.blocked}
        steps={micCopy.blockedSteps}
        retry={c.tryAgain}
        typeInstead={c.typeInstead}
        onRetry={() => {
          listen.reset();
          listen.start(true);
        }}
        onType={() => void typeInstead()}
      />
    ) : listen.status === 'unsupported' ? (
      <NoSpeech title={micCopy.noSpeechTitle} body={micCopy.noSpeechBody} action={c.typeIt} onType={() => void typeInstead()} />
    ) : (
      <BigMicButton state={micState} label={micLabel} ariaLabel={micAria} onToggle={toggle} side={desktop} hideLabel={desktop} />
    );
  const blockedOrNone = listen.status === 'denied' || listen.status === 'unsupported';

  const clock = <Elapsed time={formatClock(elapsed)} word={listen.listening ? k.talking : k.pausedWord} />;
  const exitButton = (
    <Button variant="quiet" icon="close" onPress={() => void exit()} className="px-[.8rem]">
      {c.exit}
    </Button>
  );
  const heard = sorting ? (
    <Working icon="tidy" title={k.sorting} body={k.sortingBody} />
  ) : (
    <HeardTranscript
      label={desktop ? undefined : k.heard}
      text={transcript}
      partial={listen.partial}
      placeholder={k.placeholder}
      large={desktop}
    />
  );
  const doneButton = !blockedOrNone && (
    <Button
      variant="primary"
      size="XL"
      icon="done"
      onPress={() => void done()}
      isDisabled={sorting}
      className={desktop ? 'self-end' : 'min-h-[4.2rem] w-full'}
    >
      {c.done}
    </Button>
  );

  if (desktop)
    return (
      <div className="flex min-h-dvh flex-col bg-paper bg-(image:--grain)">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          {exitButton}
          {clock}
        </header>
        <main className="mx-auto flex w-[760px] max-w-full flex-1 flex-col gap-6.5 pt-12 pb-8">
          <div className="flex items-center gap-6.5">
            {blockedOrNone ? null : mic}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl leading-[1.05] tracking-[-0.02em]">{k.title}</h1>
              <span className="text-lg text-ink-muted">{k.helperShort}</span>
            </div>
          </div>
          {blockedOrNone && mic}
          {!blockedOrNone && heard}
          <div className="mt-auto flex flex-col">{doneButton}</div>
        </main>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col bg-paper bg-(image:--grain)">
      <header className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2">
        {exitButton}
        {clock}
      </header>
      <main className="flex flex-1 flex-col">
        <div className="flex flex-col gap-2.5 px-6 pt-7.5">
          <h1 className="text-2xl leading-[1.1] tracking-[-0.015em]">{k.title}</h1>
          <p className="text-lg leading-[1.35] text-ink-muted [text-wrap:pretty]">{k.helper}</p>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 pt-7.5">{mic}</div>
        {!blockedOrNone && <div className="mx-4 mt-6">{heard}</div>}
        <div className="mt-auto px-3 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">{doneButton}</div>
      </main>
    </div>
  );
}
