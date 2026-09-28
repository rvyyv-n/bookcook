import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useSpeaker } from '../../app/speech';
import { useIsDesktop } from '../../app/useMediaQuery';
import { deleteDraft, getDraft, patchDraft } from '../../db/drafts';
import { deleteMedia, putMedia } from '../../db/media';
import { useSettings } from '../../db/hooks';
import type { Draft, Ingredient } from '../../db/types';
import { useT } from '../../i18n';
import { ingredientParts } from '../../lib/parse/ingredient';
import { canRecord, startRecording, type Recording } from '../../lib/platform/recorder';
import { findDurations, formatClock } from '../../lib/parse/timers';
import { AudioPlayer } from '../../ui/AudioPlayer';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { RecordButton, SavedIndicator } from '../../ui/Editor';
import {
  AnswerCard,
  BigMicButton,
  CaptureControl,
  HandsFreeSwitch,
  HeardRow,
  HeardRows,
  HeardStep,
  HeardTimer,
  LiveWords,
  MicBlocked,
  NoSpeech,
  StoryHeard,
  TellProgress,
  type MicState,
} from '../../ui/Mic';
import { useToast } from '../../ui/Toast';
import { checkText, useVoiceNote } from '../editor/sections';
import { isBlankDraft } from '../editor/model';
import { useLeave } from './NewRecipe';
import { advance, closeOpen, hear, isShortStage, isTellStage, stageNumber, TELL_STAGES, type TellStage, type TellState } from './tell';
import { useListen } from './useListen';

const TOTAL = TELL_STAGES.length;

/** A step's text with its first duration marked as a timer ("… for ⏱ 30 min."). */
function StepText({ text }: { text: string }) {
  const d = findDurations(text)[0];
  if (!d) return <>{text}</>;
  return (
    <>
      {text.slice(0, d.index)}
      <HeardTimer>{text.slice(d.index, d.index + d.length)}</HeardTimer>
      {text.slice(d.index + d.length)}
    </>
  );
}

function amountText(i: Ingredient): string {
  const p = ingredientParts(i);
  return [p.quantity, p.unit].filter(Boolean).join(' ');
}

function stateOf(draft: Draft): TellState {
  const p = draft.progress ?? {};
  return {
    stage: isTellStage(draft.step) ? draft.step : 'title',
    recipe: draft.recipe,
    ...(typeof p.section === 'string' ? { section: p.section } : {}),
    ...(typeof p.open === 'string' ? { open: p.open } : {}),
  };
}

/**
 * `/new/tell/:draftId`: the guided interview. One question at a time in large type, the big mic, the
 * words as they're heard, and what's been understood so far. The draft saves after every answer, so
 * Exit (or closing the tab) keeps it. After the last question comes Check your recipe.
 */
export function TellItPage() {
  const { draftId } = useParams();
  const t = useT();
  const c = t.ui.capture;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();
  const leave = useLeave();
  const settings = useSettings();
  const speaker = useSpeaker();

  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [state, setState] = useState<TellState | null>(null);
  const [fresh, setFresh] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const live = useRef<TellState | null>(null);
  const history = useRef<TellState[]>([]);

  useEffect(() => {
    if (!draftId) return;
    let alive = true;
    void getDraft(draftId).then((d) => {
      if (!alive) return;
      setDraft(d ?? null);
      if (d) {
        const s = stateOf(d);
        live.current = s;
        setState(s);
      }
    });
    return () => {
      alive = false;
    };
  }, [draftId]);

  const save = useCallback(
    async (s: TellState, extra: Partial<Draft> = {}) => {
      if (!draftId) return;
      setSaving(true);
      await patchDraft(draftId, {
        recipe: s.recipe,
        step: s.stage,
        progress: { ...(s.section ? { section: s.section } : {}), ...(s.open ? { open: s.open } : {}) },
        ...extra,
      });
      setSaving(false);
    },
    [draftId],
  );

  const set = useCallback(
    (next: TellState, { record = true }: { record?: boolean } = {}) => {
      const prev = live.current;
      if (record && prev) history.current.push(prev);
      live.current = next;
      setState(next);
      void save(next);
    },
    [save],
  );

  // The story is kept in the teller's own voice: it's recorded while the mic listens to the answer.
  const storyRec = useRef<{ recording: Recording; startedAt: number } | null>(null);
  const starting = useRef(false);
  const [storySeconds, setStorySeconds] = useState<number | undefined>(undefined);
  /** Stop the story recording and keep it with the answer. The new state, or undefined if nothing was kept. */
  const keepStory = useCallback(async (s: TellState | null): Promise<TellState | undefined> => {
    const rec = storyRec.current;
    if (!rec) return undefined;
    storyRec.current = null;
    const seconds = (Date.now() - rec.startedAt) / 1000;
    const blob = await rec.recording.stop();
    const first = s?.recipe.story?.[0];
    if (!s || !blob.size || !first?.answer) return undefined;
    const id = await putMedia(blob, 'audio');
    if (first.audioId) void deleteMedia([first.audioId]);
    setStorySeconds(seconds);
    return { ...s, recipe: { ...s.recipe, story: s.recipe.story!.map((a, i) => (i === 0 ? { ...a, audioId: id } : a)) } };
  }, []);

  const finish = useCallback(
    async (s: TellState) => {
      if (!draftId) return;
      live.current = null;
      s = (await keepStory(s)) ?? s;
      await save(s, { step: 'review' });
      navigate(`/new/review/${draftId}`, { replace: true });
    },
    [draftId, keepStory, navigate, save],
  );

  // What was heard. Kept in a ref so the recogniser's callbacks always see the latest state.
  const onFinal = useRef<(text: string) => void>(() => {});
  const listen = useListen({
    onFinal: (text) => onFinal.current(text),
    onError: (e) => e === 'network' && toast.show({ message: c.offline, timeout: 8000 }),
  });

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return void toast.show({ message: c.nothingToUndo });
    setFresh(undefined);
    set(prev, { record: false });
  }, [c.nothingToUndo, set, toast]);

  useEffect(() => {
    onFinal.current = (text) => {
      const s = live.current;
      if (!s) return;
      const r = hear(s, text);
      switch (r.kind) {
        case 'changed':
          setFresh(r.newId);
          if (r.advance) {
            history.current.push(s);
            const a = advance(r.state);
            live.current = null; // so `set` doesn't record the in-between state
            set(a.state, { record: false });
          } else set(r.state);
          return;
        case 'advance':
          setFresh(undefined);
          return set(r.state);
        case 'finish':
          listen.stop();
          return void finish(r.state);
        case 'undo':
          return undo();
        case 'back': {
          const i = TELL_STAGES.indexOf(s.stage);
          if (i > 0) set({ ...closeOpen(s), stage: TELL_STAGES[i - 1]! });
          return;
        }
        case 'stop':
          return listen.stop();
        case 'unclear':
          return void toast.show({ message: c.didntCatch });
        case 'nothing':
          return;
      }
    };
  });

  const stage = state?.stage;

  // Ask each question out loud (a setting), pausing the mic so it doesn't hear itself.
  const asked = useRef<TellStage | undefined>(undefined);
  useEffect(() => {
    if (!stage || asked.current === stage) return;
    asked.current = stage;
    if (!settings.speakQuestions || !speaker.canSpeak) return;
    const resume = listen.listening;
    listen.stop();
    void speaker.speak(t.tell.questions[stage]).then(() => {
      if (resume && asked.current === stage) listen.start(true);
    });
    // Only when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    if (stage !== 'story' || listen.status !== 'listening' || storyRec.current || starting.current || !canRecord()) return;
    starting.current = true;
    void startRecording()
      .then((recording) => {
        storyRec.current = { recording, startedAt: Date.now() };
      })
      .catch(() => {})
      .finally(() => {
        starting.current = false;
      });
  }, [stage, listen.status]);
  useEffect(() => {
    if (listen.status === 'listening' || !storyRec.current) return;
    void keepStory(live.current).then((kept) => kept && set(kept));
  }, [listen.status, keepStory, set]);
  useEffect(() => () => storyRec.current?.recording.cancel(), []);

  const tipsNote = useVoiceNote((id) => {
    const s = live.current;
    if (s) set({ ...s, recipe: { ...s.recipe, tipsAudioId: id } });
  });

  function toggleMic() {
    if (listen.status === 'listening') return listen.stop();
    speaker.cancel();
    if (tipsNote.recording) void tipsNote.toggle();
    listen.start(handsFree);
  }

  function setHands(on: boolean) {
    setHandsFree(on);
    if (on && listen.status === 'idle') listen.start(true);
    if (!on && listen.listening) listen.stop();
  }

  function next() {
    const s = live.current;
    if (!s) return;
    setFresh(undefined);
    const r = advance(s);
    if (r.finished) {
      listen.stop();
      void finish(r.state);
    } else set(r.state);
  }

  async function typeInstead() {
    const s = live.current;
    if (!draftId || !s) return;
    listen.stop();
    live.current = null;
    await patchDraft(draftId, {
      mode: 'type',
      recipe: closeOpen(s).recipe,
      ingredientLines: undefined,
      step: undefined,
      progress: undefined,
    });
    navigate(`/new/type/${draftId}`, { replace: true });
  }

  async function exit() {
    listen.stop();
    const s = live.current;
    live.current = null;
    if (draftId && s) {
      if (isBlankDraft(s.recipe, [])) await deleteDraft(draftId);
      else await save(s);
    }
    leave();
  }

  // Space to talk, Esc to exit (desktop); not while typing or on a focused control.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, button, [role="switch"], a, [role="dialog"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        toggleMic();
      } else if (e.key === 'Escape') void exit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;
  if (!state || !stage) return null;

  const recipe = state.recipe;
  const question = t.tell.questions[stage];
  const helper = stage === 'author' && recipe.author ? t.tell.helpers.authorKeep(recipe.author) : t.tell.helpers[stage];
  const progress = c.progress(t.tell.stageNames[stage], stageNumber(stage), TOTAL);
  const blocked = listen.status === 'denied';
  const unsupported = listen.status === 'unsupported';
  const bare = blocked || unsupported;
  const answered =
    stage === 'title' ? !!recipe.title : stage === 'author' ? !!recipe.author : stage === 'servings' ? !!recipe.servings : undefined;

  const micState: MicState =
    listen.status === 'processing' ? 'processing' : listen.status === 'listening' ? 'listening' : tipsNote.recording ? 'disabled' : 'idle';
  const micLabel = { idle: c.tapToTalk, listening: c.listening, processing: c.writing, disabled: c.wait }[micState];
  const words = listen.partial && <LiveWords className={desktop ? 'max-w-none' : undefined}>{listen.partial}</LiveWords>;

  const mic = blocked ? (
    <MicBlocked
      title={c.blocked}
      steps={c.blockedSteps}
      retry={c.tryAgain}
      typeInstead={c.typeInstead}
      onRetry={() => {
        listen.reset();
        listen.start(handsFree);
      }}
      onType={() => void typeInstead()}
    />
  ) : unsupported ? (
    <NoSpeech title={c.noSpeechTitle} body={c.noSpeechBody} action={c.typeIt} onType={() => void typeInstead()} />
  ) : (
    <BigMicButton
      state={micState}
      label={micLabel}
      ariaLabel={micState === 'listening' ? c.micStop : c.micStart}
      onToggle={toggleMic}
      side={desktop}
    >
      {desktop && words}
    </BigMicButton>
  );

  // What's been understood so far, for this question.
  let heard: ReactNode = null;
  if (isShortStage(stage)) {
    const cards = [
      recipe.title && (
        <AnswerCard key="n" label={c.name}>
          {recipe.title}
        </AnswerCard>
      ),
      recipe.author && (
        <AnswerCard key="a" label={c.whose}>
          {recipe.author}
        </AnswerCard>
      ),
      recipe.servings && (
        <AnswerCard key="s" label={c.serves}>
          {recipe.servings}
        </AnswerCard>
      ),
    ].filter(Boolean);
    if (cards.length) heard = <div className="flex flex-col gap-3">{cards}</div>;
  } else if (stage === 'ingredients') {
    const rows = recipe.ingredients ?? [];
    const label = state.section ? (desktop ? c.sectionSoFar(state.section) : c.forSection(state.section)) : c.soFar;
    heard = (
      <HeardRows label={label}>
        {rows.length ? (
          rows.map((i) => (
            <HeardRow
              key={i.id}
              amount={amountText(i)}
              name={[i.name, i.note].filter(Boolean).join(', ')}
              isNew={i.id === fresh}
              check={i.check && i.id !== fresh ? t.ui.review.checkThis : undefined}
              wide={desktop}
            />
          ))
        ) : (
          <li className="pb-2 text-ink-muted">{c.nothingYet}</li>
        )}
      </HeardRows>
    );
  } else if (stage === 'steps') {
    const steps = recipe.steps ?? [];
    if (steps.length || state.open)
      heard = (
        <ol className="flex flex-col gap-2.5">
          {steps.map((s, i) => (
            <HeardStep key={s.id} n={i + 1}>
              <StepText text={s.text} />
            </HeardStep>
          ))}
          {state.open && (
            <HeardStep n={steps.length + 1} open>
              <StepText text={state.open[0]!.toUpperCase() + state.open.slice(1)} />
            </HeardStep>
          )}
        </ol>
      );
  } else if (stage === 'tips') {
    heard = (
      <div className="flex flex-col gap-3">
        {recipe.tips && <AnswerCard label={c.tip(1)}>{recipe.tips}</AnswerCard>}
        {recipe.tipsAudioId && (
          <AudioPlayer
            id={recipe.tipsAudioId}
            label={`${t.ui.editor.voiceNote}: ${c.tip(1)}`}
            playLabel={t.ui.recipe.play}
            pauseLabel={t.ui.recipe.pause}
          />
        )}
        {tipsNote.available && (
          <RecordButton recording={tipsNote.recording} onPress={() => (listen.stop(), void tipsNote.toggle())}>
            {tipsNote.recording ? t.ui.editor.stopRecording(formatClock(tipsNote.elapsed)) : t.ui.editor.recordNote}
          </RecordButton>
        )}
      </div>
    );
  } else if (stage === 'story') {
    const s = recipe.story?.[0];
    if (s?.answer) heard = <StoryHeard kept={s.audioId ? c.kept(formatClock(storySeconds ?? 0)) : undefined}>“{s.answer}”</StoryHeard>;
  }

  // Unsure rows say why, for screen readers too.
  const unsure = (recipe.ingredients ?? []).filter((i) => i.check).map((i) => `${i.name}: ${checkText(t, i.check!)}`);

  const skipOrNext =
    answered === false ||
    (stage === 'steps' && !recipe.steps?.length && !state.open) ||
    (stage === 'tips' && !recipe.tips && !recipe.tipsAudioId);
  const nextButton = !bare && stage !== 'story' && (
    <Button variant="secondary" iconEnd={skipOrNext ? 'skip' : 'next'} onPress={next} className={desktop ? undefined : 'self-center'}>
      {skipOrNext ? c.skip : c.next}
    </Button>
  );

  const controls = bare ? null : stage === 'story' ? (
    <div className={cx('grid gap-2', desktop ? 'grid-cols-[auto_auto] justify-start' : 'grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]')}>
      <CaptureControl icon="skip" stacked={!desktop} onPress={() => void finish(closeOpen(state))}>
        {c.skip}
      </CaptureControl>
      <Button variant="primary" size={desktop ? 'L' : 'XL'} icon="done" onPress={next} className={desktop ? undefined : 'min-h-[4.2rem]'}>
        {c.done}
      </Button>
    </div>
  ) : (
    <div className={desktop ? 'flex flex-wrap items-center gap-2.5' : 'grid grid-cols-3 gap-2'}>
      <HandsFreeSwitch on={handsFree} onChange={setHands} stacked={!desktop}>
        {c.handsFree}
      </HandsFreeSwitch>
      <CaptureControl icon="undo" stacked={!desktop} onPress={undo}>
        {c.undoLast}
      </CaptureControl>
      <CaptureControl icon="keyboard" stacked={!desktop} onPress={() => void typeInstead()}>
        {c.typeInstead}
      </CaptureControl>
      {desktop && <span className="ml-auto self-center text-[0.8333rem] whitespace-nowrap text-ink-muted">{c.keys}</span>}
    </div>
  );

  const exitButton = (
    <Button variant="quiet" icon="close" onPress={() => void exit()} className="shrink-0 justify-self-start px-[.8rem]">
      {c.exit}
    </Button>
  );
  const srUnsure = unsure.length > 0 && <p className="sr-only">{unsure.join('. ')}</p>;

  if (desktop)
    return (
      <div className="flex h-dvh flex-col bg-paper bg-(image:--grain)">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-6 py-4">
          {exitButton}
          <TellProgress label={progress} current={stageNumber(stage)} total={TOTAL} segments />
          <span className="justify-self-end">
            <SavedIndicator saving={saving} label={saving ? t.ui.editor.saving : t.ui.editor.draftSaved} />
          </span>
        </header>
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-14 overflow-auto px-16 py-12">
          <div className="flex flex-col gap-3.5">
            <h1 className="text-3xl leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">{question}</h1>
            <p className="text-lg text-ink-muted">{helper}</p>
            <div className="pt-8.5 pb-2.5">{mic}</div>
            {nextButton && <div>{nextButton}</div>}
            <div className="mt-auto pt-6">{controls}</div>
          </div>
          <div className="self-start">{heard}</div>
          {srUnsure}
        </main>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col bg-paper bg-(image:--grain)">
      <header className="flex items-start justify-between gap-2 pt-[max(1rem,env(safe-area-inset-top))] pr-4 pl-2">
        {exitButton}
        <TellProgress label={progress} current={stageNumber(stage)} total={TOTAL} />
      </header>
      <main className="flex flex-1 flex-col">
        <div className="flex flex-col gap-3 px-6 pt-7.5">
          <h1 className="text-2xl leading-[1.1] tracking-[-0.015em] [text-wrap:balance]">{question}</h1>
          <p className="text-ink-muted [text-wrap:pretty]">{helper}</p>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-1 text-center">
          {mic}
          {words}
        </div>
        {heard && <div className="mx-4 mt-5">{heard}</div>}
        {nextButton && <div className="flex flex-col px-4 pt-4">{nextButton}</div>}
        {srUnsure}
        <div className="mt-auto px-3 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">{controls}</div>
      </main>
    </div>
  );
}
