import { cloneElement, Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { FileTrigger } from 'react-aria-components';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useSpeaker } from '../../app/speech';
import { isTypingTarget } from '../../app/shortcuts';
import { useIsDesktop } from '../../app/useMediaQuery';
import { useRecipe, useSettings } from '../../db/hooks';
import { putMedia } from '../../db/media';
import { logCook } from '../../db/recipes';
import type { Ingredient, Recipe } from '../../db/types';
import { skinConfig, spiceGroups } from '../../design/skin';
import { useT } from '../../i18n';
import type { Command } from '../../lib/parse/commands';
import { formatIngredient, ingredientParts } from '../../lib/parse/ingredient';
import { segmentStep } from '../../lib/parse/segments';
import { getUnit } from '../../lib/parse/units';
import { formatClock, formatDuration, spokenDuration, type DurationMatch } from '../../lib/parse/timers';
import { compressImage } from '../../lib/platform/image';
import { useWakeLock } from '../../lib/platform/wakeLock';
import { newId } from '../../db/db';
import { Button, ButtonLink } from '../../ui/Button';
import { CheckItem, Segmented, StarRating, Stepper, Struck } from '../../ui/Controls';
import {
  CookControls,
  ListeningIndicator,
  Mention,
  PinnedTimer,
  StepBar,
  StepNumeral,
  StepPhoto,
  StepTitle,
  TimerAlert,
  type ListeningState,
} from '../../ui/Cook';
import { cx } from '../../ui/cx';
import { RollScope, Rolling } from '../../ui/Rolling';
import { TextField } from '../../ui/Field';
import { TimerChip } from '../../ui/TimerChip';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { prefersReducedMotion } from '../../ui/motion';
import { useAdjustedIngredients } from '../recipe/useAdjusted';
import { elapsed, secondsLeft, stepTimer, timerForStep, timerState, type CookTimer } from './timers';
import { useAlarm, useCookTimers, useVoiceCommands } from './useCook';

type Adjusted = ReturnType<typeof useAdjustedIngredients>;
type T = ReturnType<typeof useT>;

/** "18 minutes 30 seconds", for screen readers. */
function lengthWords(t: T, seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const c = t.ui.cook;
  return [h && c.hours(h), m && c.minutes(m), (s || (!h && !m)) && c.seconds(s)].filter(Boolean).join(' ');
}

const timerLabel = (t: T, timer: CookTimer) => timer.name ?? t.ui.cook.plainTimer(formatDuration(timer.total));

/**
 * The step with its ingredients as mentions (tapping one shows the scaled amount) and its durations as
 * timer chips, drawn by `duration`.
 */
function StepText({
  text,
  ingredients,
  duration,
}: {
  text: string;
  ingredients: Ingredient[];
  duration: (match: DurationMatch) => ReactNode;
}) {
  const groups = useMemo(() => spiceGroups(ingredients.map((i) => i.section)), [ingredients]);
  const parts = useMemo(() => {
    const byId = new Map(ingredients.map((i) => [i.id, i]));
    return segmentStep(text, ingredients).map((s) => ({ ...s, ingredient: s.ingredientId ? byId.get(s.ingredientId) : undefined }));
  }, [text, ingredients]);
  return parts.map((p, i) => {
    if (p.duration) return <Fragment key={i}>{duration(p.duration)}</Fragment>;
    if (!p.ingredient) return <span key={i}>{p.text}</span>;
    const q = ingredientParts(p.ingredient);
    const amount = [q.quantity, q.unit].filter(Boolean).join(' ');
    return (
      <Mention
        key={i}
        label={amount ? `${p.text}, ${amount}` : p.text}
        amount={formatIngredient(p.ingredient)}
        spiceGroup={p.ingredient.section ? groups.get(p.ingredient.section) : undefined}
      >
        {p.text}
      </Mention>
    );
  });
}

/** The ingredient checklist, in its sections. `forServings` adds "· for 4" to headings when scaled. */
function Checklist({
  ingredients,
  checked,
  onToggle,
  dense = false,
  forServings,
}: {
  ingredients: Ingredient[];
  checked: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  dense?: boolean;
  forServings?: string;
}) {
  const groups: { section?: string; items: Ingredient[] }[] = [];
  for (const i of ingredients) {
    const last = groups.at(-1);
    if (last && last.section === i.section) last.items.push(i);
    else groups.push({ section: i.section, items: [i] });
  }
  const spice = spiceGroups(groups.map((g) => g.section));
  return (
    <div className={cx('flex flex-col', !dense && 'gap-3.5')}>
      {groups.map((g, gi) => (
        <section key={gi} aria-label={g.section} data-spice-group={g.section ? spice.get(g.section) : undefined} className="flex flex-col">
          {g.section && (
            <h3
              className={cx(
                'flex items-center font-(family-name:--font-display) font-bold text-(color:--sp-heading) [font-variation-settings:var(--font-display-settings)]',
                dense ? 'gap-2 pt-1.5 text-base' : 'gap-2.5 pt-1 pb-1 text-base',
              )}
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--sp) [display:var(--sp-show)]" />
              {forServings ? `${g.section} · ${forServings}` : g.section}
              {!dense && <span aria-hidden className="h-px flex-1 bg-(--sp) [display:var(--sp-rule)]" />}
            </h3>
          )}
          <ul className="flex flex-col">
            {g.items.map((i) => {
              // As on the recipe page: trailing amounts lead ("to taste salt"), and "a handful of" drops the "of".
              const p = ingredientParts(i);
              const unit = getUnit(i.unit);
              const amount = unit?.trailing ? unit.singular : [p.quantity, p.unit].filter(Boolean).join(' ');
              const note = unit?.trailing ? i.note : p.note;
              return (
                <li key={i.id}>
                  <CheckItem dense={dense} isSelected={checked.has(i.id)} onChange={(on) => onToggle(i.id, on)}>
                    <Struck>
                      {amount && (
                        <b>
                          <Rolling value={amount}>{amount}</Rolling>
                        </b>
                      )}{' '}
                      {p.name}
                      {note && `, ${note}`}
                    </Struck>
                  </CheckItem>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ServingsStepper({ adj }: { adj: Adjusted }) {
  const t = useT();
  if (!adj.canScale) return null;
  return (
    <Stepper
      compact
      label={t.ui.recipe.servings}
      value={adj.servings}
      onChange={adj.setServings}
      decrementLabel={t.ui.recipe.fewerServings}
      incrementLabel={t.ui.recipe.moreServings}
    />
  );
}

/** "I made it": a rating, a note and a photo. Saving writes the cook log and counts the cook. */
function MadeItSheet({ recipe, isOpen, onOpenChange }: { recipe: Recipe; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const m = t.ui.cook.made;
  const toast = useToast();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const photoId = photo ? await putMedia(photo, 'photo', recipe.id) : undefined;
    await logCook({ recipeId: recipe.id, cookedAt: Date.now(), rating: rating || undefined, note: note.trim() || undefined, photoId });
    toast.show({ message: m.saved, tone: 'success' });
    navigate(`/r/${recipe.id}`);
  }

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={t.ui.cook.madeIt} description={m.count(recipe.cookedCount + 1)}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <b>{m.question}</b>
          <StarRating label={m.rating} value={rating} onChange={setRating} starLabel={m.star} />
        </div>
        <TextField label={m.note} value={note} onChange={setNote} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2.5">
          <FileTrigger
            acceptedFileTypes={['image/*']}
            onSelect={async (files) => {
              const file = files?.[0];
              if (file) setPhoto(await compressImage(file));
            }}
          >
            <Button variant="secondary" icon={photo ? 'check' : 'addPhoto'} className="min-h-[4rem]!">
              {photo ? m.photoAdded : m.photo}
            </Button>
          </FileTrigger>
          <Button variant="primary" className="min-h-[4rem]!" isDisabled={saving} onPress={save}>
            {m.save}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * The pinned timer tiles, plus a fading copy of any that has just finished or been stopped, left where
 * it was so the others close up once it has gone. Under reduced motion it's just removed.
 */
type Tile = ReactElement<{ leaving?: boolean }>;

function useLeavingTiles(tiles: Tile[]): Tile[] {
  const [ghosts, setGhosts] = useState<{ el: Tile; index: number }[]>([]);
  const last = useRef(tiles);
  const keys = tiles.map((t) => t.key).join('|');
  // Declared before the effect that keeps `last` up to date, so it still sees the previous tiles.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const current = new Set(keys.split('|'));
    const gone = last.current.flatMap((el, index) =>
      current.has(String(el.key)) ? [] : [{ el: cloneElement(el, { leaving: true }), index }],
    );
    if (!gone.length) return;
    setGhosts((all) => [...all, ...gone]);
    setTimeout(() => setGhosts((all) => all.filter((g) => !gone.includes(g))), 200);
  }, [keys]);
  useEffect(() => {
    last.current = tiles;
  });
  const out = [...tiles];
  for (const g of ghosts) out.splice(Math.min(g.index, out.length), 0, g.el);
  return out;
}

function Cook({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const c = t.ui.cook;
  const settings = useSettings();
  const wide = useIsDesktop();
  const field = skinConfig[settings.skin].cookSurface === 'field';
  const numeral = skinConfig[settings.skin].stepHeader === 'numeral';
  const adj = useAdjustedIngredients(recipe);
  const speaker = useSpeaker();
  const timers = useCookTimers(recipe.id);
  useWakeLock();

  const steps = recipe.steps;
  const total = steps.length;
  const [params, setParams] = useSearchParams();
  const index = Math.min(Math.max(0, Number(params.get('step') ?? 1) - 1 || 0), Math.max(0, total - 1));
  const step = steps[index];
  const isLast = index === total - 1;

  const [dir, setDir] = useState<'next' | 'back' | null>(null);
  const [sheet, setSheet] = useState(false);
  const [made, setMade] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [heard, setHeard] = useState<string | null>(null);

  const read = useCallback(
    (i: number) => {
      const s = steps[i];
      if (s) void speaker.speak(`${t.speak.stepOf(i + 1, total)} ${s.text}`);
    },
    [steps, speaker, t, total],
  );

  // Read each step as it comes up, when that's switched on.
  const readAloud = settings.readAloud;
  const lastRead = useRef<number | null>(null);
  useEffect(() => {
    if (!readAloud || lastRead.current === index) return;
    lastRead.current = index;
    read(index);
  }, [index, readAloud, read]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return;
      speaker.cancel();
      setDir(i > index ? 'next' : 'back');
      setParams({ step: String(i + 1) }, { replace: true });
    },
    [index, total, speaker, setParams],
  );
  const next = () => (isLast ? (speaker.cancel(), setMade(true)) : go(index + 1));
  const toggleRead = () => (speaker.speaking ? speaker.cancel() : read(index));

  /** Start the step's timer, or the timer for one of its durations (its chip was tapped). */
  function startStepTimer(which?: DurationMatch) {
    if (!step) return;
    const found = which ? { seconds: which.seconds, index: which.index, end: which.index + which.length } : stepTimer(step);
    if (!found) return void speaker.speak(t.speak.noTimer);
    if (timers.timers.some((x) => x.stepIndex === index && x.source === found.index && timerState(x, Date.now()) !== 'finished')) return;
    const timer = timerForStep(step, index, adj.ingredients, Date.now(), newId(), found)!;
    timers.add(timer);
    void speaker.speak(t.speak.timerStarted(timerLabel(t, timer)));
  }

  /** A duration's chip: tap to start it; then its time left (tap to pause); then Done. */
  function durationChip(d: DurationMatch) {
    const timer = timers.timers.find((x) => x.stepIndex === index && x.source === d.index);
    const state = timer && timerState(timer, timers.now);
    if (!timer || !state)
      return (
        <TimerChip state="idle" ariaLabel={c.startTimer(lengthWords(t, d.seconds))} onPress={() => startStepTimer(d)}>
          {d.text}
        </TimerChip>
      );
    const label = timerLabel(t, timer);
    if (state === 'finished')
      return (
        <TimerChip state="done" ariaLabel={c.timerDone(label)} onPress={stopAlarm}>
          {c.chipDone}
        </TimerChip>
      );
    const left = secondsLeft(timer, timers.now);
    return (
      <TimerChip
        state={state === 'paused' ? 'paused' : 'running'}
        ariaLabel={c.timerAria(label, lengthWords(t, left), state)}
        onPress={() => timers.toggle(timer.id)}
      >
        {c.timeLeft(formatClock(left))}
      </TimerChip>
    );
  }

  function stopAlarm() {
    timers.remove(timers.finished.map((x) => x.id));
    speaker.cancel();
  }

  useAlarm(timers.finished, (id) => {
    const timer = timers.finished.find((x) => x.id === id);
    if (timer) void speaker.speak(t.speak.timerDone(timer.name?.toLowerCase() ?? spokenDuration(timer.total)));
  });

  const voice = useVoiceCommands((command: Command, said: string) => {
    setHeard(said.trim().toLowerCase());
    switch (command.type) {
      case 'next':
        return next();
      case 'back':
        return go(index - 1);
      case 'repeat':
        return read(index);
      case 'done':
        return isLast && next();
      case 'startTimer':
        return startStepTimer();
      case 'setTimer': {
        const at = Date.now();
        const timer: CookTimer = { id: newId(), total: command.seconds, endsAt: at + command.seconds * 1000 };
        timers.add(timer);
        return void speaker.speak(t.speak.timerStarted(timerLabel(t, timer)));
      }
      case 'stop':
        return timers.finished.length ? stopAlarm() : speaker.cancel();
      case 'ingredients':
        return void speaker.speak(`${t.speak.ingredientsIntro} ${adj.ingredients.map(formatIngredient).join(', ')}.`);
      default:
        return;
    }
  });
  useEffect(() => {
    if (!heard) return;
    const id = setTimeout(() => setHeard(null), 1000);
    return () => clearTimeout(id);
  }, [heard]);

  // ← → steps, Space reads, T starts the step's timer.
  const keys = useRef({ next, back: () => go(index - 1), toggleRead, startStepTimer });
  useEffect(() => {
    keys.current = { next, back: () => go(index - 1), toggleRead, startStepTimer };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = keys.current;
      if (e.key === 'ArrowRight') k.next();
      else if (e.key === 'ArrowLeft') k.back();
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) k.toggleRead();
      else if (e.key === 't' || e.key === 'T') k.startStepTimer();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const indicator: ListeningState = heard ? 'heard' : speaker.speaking ? 'reading' : voice === 'off' ? 'off' : 'listening';
  const word = { heard: c.heard(heard ?? ''), reading: c.reading, off: c.micOff, listening: c.listening }[indicator];
  const listening = <ListeningIndicator state={indicator} word={word} hint={voice === 'off' ? c.micOffHint : c.commands} />;

  const alert = timers.finished[0];
  const alertCard = alert && (
    <TimerAlert
      title={c.timerDone(timerLabel(t, alert))}
      detail={alert.detail}
      addLabel={c.addMinute}
      stopLabel={t.ui.common.stop}
      onAdd={() => timers.addMinute(alert.id)}
      onStop={stopAlarm}
    />
  );
  const running = timers.timers.filter((x) => timerState(x, timers.now) !== 'finished');
  const pinned = running.map((x) => {
    const state = timerState(x, timers.now) as 'running' | 'hot' | 'paused';
    const label = timerLabel(t, x);
    const left = secondsLeft(x, timers.now);
    return (
      <PinnedTimer
        key={x.id}
        wide={wide}
        label={state === 'paused' ? c.timerPaused(label) : label}
        time={formatClock(left)}
        progress={elapsed(x, timers.now)}
        state={state}
        ariaLabel={c.timerAria(label, lengthWords(t, left), state)}
        spiceGroup={x.spiceGroup}
        onPress={() => timers.toggle(x.id)}
      />
    );
  });
  const tiles = useLeavingTiles(pinned);
  const timerGroup = tiles.length > 0 && (
    <div
      role="group"
      aria-label={c.timers}
      className={cx(
        'rounded-md bg-(--timer-group-bg) [box-shadow:var(--timer-group-shadow)]',
        wide ? 'flex flex-wrap gap-2.5' : 'grid gap-2.5',
      )}
    >
      {tiles}
    </div>
  );

  const closeButton = (
    <ButtonLink href={`/r/${recipe.id}`} variant="quiet" icon="close" className="gap-1.5! px-[.8rem]!">
      {t.ui.common.close}
    </ButtonLink>
  );
  const controls = (
    <CookControls
      wide={wide}
      labels={{ back: c.back, read: c.read, stop: c.stop, next: c.next, madeIt: c.madeIt }}
      reading={speaker.speaking}
      isFirst={index === 0}
      isLast={isLast}
      onBack={() => go(index - 1)}
      onRead={toggleRead}
      onNext={next}
      className={wide ? 'max-w-[760px]' : undefined}
    />
  );
  const stepBody = step ? (
    <div
      key={index}
      className={cx(
        'flex flex-col',
        wide ? 'min-h-0 max-w-[860px] flex-1 justify-center gap-5.5' : 'gap-4.5 px-2.5 pt-2',
        dir === 'next' && 'animate-step-next',
        dir === 'back' && 'animate-step-back',
      )}
    >
      <p
        className={cx(
          'font-(family-name:--font-display) [font-weight:var(--step-weight)] [font-variation-settings:var(--step-settings)] text-pretty',
          wide ? 'text-4xl leading-[1.1] tracking-[-0.02em]' : 'text-(length:--step-size) leading-[1.13] tracking-[-0.015em]',
        )}
      >
        <StepText text={step.text} ingredients={adj.ingredients} duration={durationChip} />
      </p>
      {settings.stepPhoto && step.photoId && <StepPhoto id={step.photoId} caption={c.stepPhoto} wide={wide} />}
    </div>
  ) : (
    <p className="px-2.5 text-lg">{c.noSteps}</p>
  );
  const toggle = (id: string, on: boolean) =>
    setChecked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const madeSheet = <MadeItSheet recipe={recipe} isOpen={made} onOpenChange={setMade} />;
  const title = c.stepOf(index + 1, total);
  // Said by a screen reader on every step change, whether the step was reached by touch, key or voice.
  const announce = (
    <p aria-live="polite" className="sr-only">
      {title} {step?.text}
    </p>
  );

  if (wide)
    return (
      <main
        data-surface={field ? 'field' : undefined}
        aria-label={c.title(recipe.title)}
        className="grid h-dvh grid-cols-[340px_minmax(0,1fr)] bg-paper bg-(image:--grain) text-ink xl:grid-cols-[320px_minmax(0,1fr)]"
      >
        <aside
          aria-label={t.ui.recipe.ingredients}
          className="flex flex-col gap-3 overflow-y-auto border-r border-line bg-sunk px-5.5 py-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl">{t.ui.recipe.ingredients}</h2>
            <ServingsStepper adj={adj} />
          </div>
          <RollScope value={adj.servings}>
            <Checklist dense ingredients={adj.ingredients} checked={checked} onToggle={toggle} />
          </RollScope>
        </aside>
        <div className="flex min-w-0 flex-col gap-5.5 overflow-y-auto px-8 pt-5.5 pb-6.5">
          <div className="flex items-center gap-4.5">
            <StepTitle>{title}</StepTitle>
            <StepBar current={index} total={total} className="max-w-[320px] flex-1" />
            {listening}
            <div className="ml-auto">{closeButton}</div>
          </div>
          {announce}
          {alertCard}
          {timerGroup}
          {stepBody}
          {controls}
          <p className="hidden text-[0.875rem] text-ink-muted pointer-fine:block">{c.keysHint}</p>
        </div>
        {madeSheet}
      </main>
    );

  return (
    <main
      data-surface={field ? 'field' : undefined}
      aria-label={c.title(recipe.title)}
      className="flex min-h-dvh flex-col gap-4.5 overflow-x-clip bg-paper bg-(image:--grain) px-3.5 pt-4 pb-4.5 text-ink"
    >
      <div className="flex justify-between">
        {closeButton}
        <Button variant="quiet" icon="ingredients" onPress={() => setSheet(true)} className="gap-1.5! pr-4! pl-[.8rem]!">
          {t.ui.recipe.ingredients}
        </Button>
      </div>
      {numeral ? (
        <div className="flex items-end justify-between gap-2.5 px-2.5">
          <StepNumeral current={index} total={total} of={c.of(total)} label={title} />
          {listening}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <StepTitle>{title}</StepTitle>
            {listening}
          </div>
          <StepBar current={index} total={total} />
        </div>
      )}
      {announce}
      {alertCard}
      {timerGroup}
      {stepBody}
      {/* Pinned to the bottom, so at Large and Huge the controls stay in reach while the step scrolls. */}
      <div data-cook-bar className="sticky bottom-0 -mx-3.5 mt-auto -mb-4.5 bg-paper bg-(image:--grain) px-3.5 pt-2 pb-4.5">
        {controls}
      </div>
      <Sheet isOpen={sheet} onOpenChange={setSheet} title={t.ui.recipe.ingredients}>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap gap-2">
            <ServingsStepper adj={adj} />
            <Segmented
              label={t.ui.recipe.units}
              labelHidden
              value={adj.system}
              onChange={adj.setSystem}
              options={[
                { id: 'metric', label: t.ui.recipe.metric },
                { id: 'imperial', label: t.ui.recipe.imperial },
              ]}
            />
          </div>
          <RollScope value={adj.servings}>
            <Checklist
              ingredients={adj.ingredients}
              checked={checked}
              onToggle={toggle}
              forServings={adj.canScale && adj.factor !== 1 ? c.forServings(adj.servings) : undefined}
            />
          </RollScope>
        </div>
      </Sheet>
      {madeSheet}
    </main>
  );
}

export function CookModePage() {
  const t = useT();
  const { id } = useParams();
  const recipe = useRecipe(id);
  if (recipe === undefined) return null;
  if (recipe === null)
    return (
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 p-8">
        <p className="text-lg">{t.ui.common.recipeNotFound}</p>
        <ButtonLink href="/" variant="primary" icon="cookbook">
          {t.ui.common.goHome}
        </ButtonLink>
      </main>
    );
  return <Cook key={recipe.id} recipe={recipe} />;
}
