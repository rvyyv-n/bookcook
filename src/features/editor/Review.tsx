import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { newId } from '../../db/db';
import { commitDraft } from '../../db/drafts';
import { setSetting } from '../../db/settings';
import type { Step } from '../../db/types';
import { spiceGroups } from '../../design/skin';
import { useT } from '../../i18n';
import { requestPersistentStorage } from '../../lib/platform/storagePersist';
import { ingredientParts, parseIngredient, sectionHeading } from '../../lib/parse/ingredient';
import { stepTimer } from '../../lib/parse/timers';
import { getUnit } from '../../lib/parse/units';
import { Button } from '../../ui/Button';
import { GrowingTextArea, IngredientLineField, SaveBar } from '../../ui/Editor';
import { ReviewCard, ReviewIngredientRow, ReviewSectionHeading, ReviewStepRow, ReviewTap } from '../../ui/Review';
import { useDone } from '../../ui/motion';
import { useToast } from '../../ui/Toast';
import { minutesText, type IngredientLine } from './model';
import { checkText, DetailsFields, isHeadingLine, type EditorApi } from './sections';
import { useDraftEditor } from './useDraftEditor';

/** How many steps the phone shows before "+ 2 more". */
const PHONE_STEPS = 3;

/** "1 kg" | "chicken, bone-in". Trailing amounts ("to taste") take the amount column. */
function rowParts(text: string): { amount: string; name: string } {
  const ing = parseIngredient(text);
  const p = ingredientParts(ing);
  const unit = getUnit(ing.unit);
  const amount = unit?.trailing ? unit.singular : [p.quantity, p.unit].filter(Boolean).join(' ');
  const note = unit?.trailing ? ing.note : p.note;
  return { amount, name: [p.name, note].filter(Boolean).join(', ') };
}

/** `/new/review/:draftId` */
export function ReviewPage() {
  const { draftId } = useParams();
  return <Review key={draftId} draftId={draftId!} />;
}

/**
 * Check your recipe: what the parser made of a pasted (later: spoken or imported) recipe, as cards.
 * Tap anything to fix it in place; rows the parser was unsure of are tinted with the reason. Save
 * recipe writes the recipe and removes the draft.
 */
function Review({ draftId }: { draftId: string }) {
  const t = useT();
  const r = t.ui.review;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();
  const editor = useDraftEditor(draftId);
  const { draft, state } = editor;
  const [editing, setEditing] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [allSteps, setAllSteps] = useState(false);
  const [savedDone, finishSaving] = useDone();
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const groups = useMemo(() => spiceGroups((state?.lines ?? []).map((l) => sectionHeading(l.text))), [state?.lines]);

  async function save() {
    // Once saved, the tick is showing and the recipe is about to open: a second press does nothing.
    if (!state || !draft || savedDone) return;
    if (!state.recipe.title?.trim()) {
      setNameError(true);
      setEditing('details');
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    await editor.finish();
    const recipe = await commitDraft(draft.id);
    await finishSaving();
    if (recipe.author) void setSetting('lastAuthor', recipe.author);
    void requestPersistentStorage();
    toast.show({ message: t.ui.editor.saved, tone: 'success' });
    navigate(`/r/${recipe.id}`, { replace: true });
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        void saveRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;
  if (!state || !draft) return null;

  const ed: EditorApi = { state, update: editor.update, setRecipe: editor.setRecipe };
  const recipe = state.recipe;
  const lines = state.lines;
  const steps = recipe.steps ?? [];
  const checks = lines.filter((l) => l.check).length + steps.filter((s) => s.check).length;
  const done = () => setEditing(null);
  const setLines = (fn: (ls: IngredientLine[]) => IngredientLine[], key?: string) =>
    ed.update((s) => ({ ...s, lines: fn(s.lines) }), { key });
  const setSteps = (fn: (ls: Step[]) => Step[], key?: string) =>
    ed.update((s) => ({ ...s, recipe: { ...s.recipe, steps: fn(s.recipe.steps ?? []) } }), { key });

  // Details

  const meta = [
    recipe.servings ? t.ui.common.serves(recipe.servings) : '',
    recipe.prepMinutes ? t.ui.recipe.prep(minutesText(recipe.prepMinutes)) : '',
    recipe.cookMinutes ? t.ui.recipe.cook(minutesText(recipe.cookMinutes)) : '',
  ].filter(Boolean);
  const from = recipe.author?.trim() ? t.ui.common.fromKitchen(recipe.author.trim()) : '';
  const details = (
    <ReviewCard label={r.details} className={desktop ? 'p-4.5' : 'px-4.5 py-4'}>
      {editing === 'details' ? (
        <div className="flex flex-col gap-4 pt-2">
          <DetailsFields
            ed={{ ...ed, setRecipe: (patch, o) => (patch.title?.trim() && setNameError(false), ed.setRecipe(patch, o)) }}
            nameError={nameError}
            titleRef={titleRef}
            photo={false}
            className="flex flex-col gap-4"
          />
          <Button icon="check" onPress={done} className="self-start">
            {t.ui.common.done}
          </Button>
        </div>
      ) : (
        <ReviewTap label={r.editDetails} onPress={() => setEditing('details')}>
          <span className="type-display text-xl leading-[1.15]">{recipe.title?.trim() || t.ui.common.untitled}</span>
          {desktop ? (
            <>
              {from && <span>{from}</span>}
              {meta.length > 0 && <span className="text-ink-muted">{meta.join(' · ')}</span>}
            </>
          ) : (
            <>
              {(from || meta[0]) && <span>{[from, recipe.servings ? meta[0] : ''].filter(Boolean).join(' · ')}</span>}
              {meta.slice(recipe.servings ? 1 : 0).length > 0 && (
                <span className="text-ink-muted">{meta.slice(recipe.servings ? 1 : 0).join(' · ')}</span>
              )}
            </>
          )}
        </ReviewTap>
      )}
    </ReviewCard>
  );

  // Ingredients

  function lineLeft(line: IngredientLine, index: number, was: string) {
    done();
    if (line.text.trim()) {
      // Looked at, so no longer unsure.
      if (line.check) setLines((ls) => ls.map((l) => (l.id === line.id ? { id: l.id, text: l.text } : l)), `line:${line.id}`);
      return;
    }
    setLines((ls) => ls.filter((l) => l.id !== line.id));
    toast.undo(t.ui.editor.lineDeleted(was), () =>
      setLines((ls) => [...ls.slice(0, Math.min(index, ls.length)), { id: newId(), text: was }, ...ls.slice(Math.min(index, ls.length))]),
    );
  }

  const rows: ReactNode[] = [];
  lines.forEach((line, i) => {
    const key = `line:${line.id}`;
    if (isHeadingLine(line.text)) {
      const name = sectionHeading(line.text) ?? '';
      rows.push(
        <ReviewSectionHeading key={line.id} spiceGroup={groups.get(name)} dense={desktop}>
          {name}
        </ReviewSectionHeading>,
      );
      return;
    }
    if (editing === key) {
      const was = line.text;
      rows.push(
        <IngredientLineField
          key={line.id}
          inputRef={(el) => el?.focus()}
          value={line.text}
          label={t.ui.editor.ingredientLine(i + 1)}
          preview={ingredientParts(parseIngredient(line.text))}
          onChange={(v) => setLines((ls) => ls.map((l) => (l.id === line.id ? { id: l.id, text: v } : l)), key)}
          onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === 'Escape') && ev.currentTarget.blur()}
          onBlur={() => lineLeft(line, i, was)}
          dense={desktop}
        />,
      );
      return;
    }
    const parts = rowParts(line.text);
    rows.push(
      <ReviewIngredientRow
        key={line.id}
        amount={parts.amount}
        name={parts.name}
        check={line.check ? checkText(t, line.check) : undefined}
        label={r.editRow(line.text)}
        onPress={() => setEditing(key)}
        dense={desktop}
      />,
    );
  });
  const ingredients = (
    <ReviewCard label={r.ingredients} className={desktop ? 'self-start px-4.5 py-3' : 'px-4.5 pt-3 pb-1.5'}>
      {rows.length ? (
        rows
      ) : (
        <ReviewTap
          label={r.empty}
          onPress={() => {
            const id = newId();
            setLines(() => [{ id, text: '' }]);
            setEditing(`line:${id}`);
          }}
        >
          <span className="py-2 text-ink-muted">{r.empty}</span>
        </ReviewTap>
      )}
    </ReviewCard>
  );

  // Steps

  function stepLeft(step: Step, index: number, was: string) {
    done();
    if (step.text.trim() || step.photoId) {
      if (step.check) setSteps((ls) => ls.map((s) => (s.id === step.id ? { ...s, check: undefined } : s)), `step:${step.id}`);
      return;
    }
    setSteps((ls) => ls.filter((s) => s.id !== step.id));
    toast.undo(t.ui.editor.stepDeleted(index + 1), () =>
      setSteps((ls) => [...ls.slice(0, Math.min(index, ls.length)), { id: newId(), text: was }, ...ls.slice(Math.min(index, ls.length))]),
    );
  }
  const shown = desktop || allSteps ? steps : steps.slice(0, PHONE_STEPS);
  const stepsCard = (
    <ReviewCard label={r.steps} className={desktop ? 'self-start px-4.5 py-3' : 'px-4.5 py-3'}>
      {shown.map((step, i) => {
        const key = `step:${step.id}`;
        if (editing === key) {
          const was = step.text;
          return (
            <div key={step.id} className="py-2">
              <GrowingTextArea
                textRef={(el) => el?.focus()}
                value={step.text}
                label={t.ui.editor.step(i + 1)}
                onChange={(v) => {
                  const seconds = stepTimer(v);
                  setSteps((ls) => ls.map((s) => (s.id === step.id ? { ...s, text: v, timerSeconds: seconds } : s)), key);
                }}
                onKeyDown={(ev) =>
                  (ev.key === 'Escape' || (ev.key === 'Enter' && !ev.shiftKey)) && (ev.preventDefault(), ev.currentTarget.blur())
                }
                onBlur={() => stepLeft(step, i, was)}
              />
            </div>
          );
        }
        return (
          <ReviewStepRow key={step.id} n={i + 1} label={`${t.ui.editor.step(i + 1)}: ${step.text}`} onPress={() => setEditing(key)}>
            {step.text}
          </ReviewStepRow>
        );
      })}
      {!steps.length && (
        <ReviewTap
          label={r.empty}
          onPress={() => {
            const id = newId();
            setSteps(() => [{ id, text: '' }]);
            setEditing(`step:${id}`);
          }}
        >
          <span className="py-2 text-ink-muted">{r.empty}</span>
        </ReviewTap>
      )}
      {shown.length < steps.length && (
        <button type="button" onClick={() => setAllSteps(true)} className="self-start rounded-sm pt-2.5 text-ink-muted hover:text-ink">
          {r.more(steps.length - shown.length)}
        </button>
      )}
    </ReviewCard>
  );

  // Tips and story

  const textCard = (id: string, label: string, value: string, onChange: (v: string) => void, display: ReactNode) => (
    <ReviewCard label={label} className={desktop ? 'p-4.5' : 'px-4.5 py-4'}>
      {editing === id ? (
        <div className="pt-1.5">
          <GrowingTextArea
            textRef={(el) => el?.focus()}
            value={value}
            label={label}
            onChange={onChange}
            onKeyDown={(ev) => ev.key === 'Escape' && ev.currentTarget.blur()}
            onBlur={done}
          />
        </div>
      ) : (
        <ReviewTap label={`${label}: ${value || r.empty}`} onPress={() => setEditing(id)}>
          {value ? display : <span className="text-ink-muted">{r.empty}</span>}
        </ReviewTap>
      )}
    </ReviewCard>
  );
  const tips = textCard(
    'tips',
    r.tips,
    recipe.tips ?? '',
    (v) => ed.setRecipe({ tips: v }),
    <span className="whitespace-pre-line">{recipe.tips}</span>,
  );
  const answer = recipe.story?.[0]?.answer ?? '';
  const story = textCard(
    'story',
    r.story,
    answer,
    (v) =>
      ed.update(
        (s) => {
          const list = s.recipe.story?.length ? s.recipe.story : [{ prompt: t.story.prompts[0]!, answer: '' }];
          return { ...s, recipe: { ...s.recipe, story: list.map((a, i) => (i === 0 ? { ...a, answer: v } : a)) } };
        },
        { key: 'story:0' },
      ),
    <span className="font-(family-name:--font-display) text-lg leading-[1.3] italic [font-variation-settings:var(--font-display-settings)]">
      “{answer}”
    </span>,
  );

  const toCheck =
    checks > 0 ? (
      <>
        <b className="text-accent-text">{r.things(checks)}</b> {r.toCheck}
      </>
    ) : null;
  const saveButton = (size: 'L' | 'XL', className?: string) => (
    <Button variant="primary" size={size} icon="check" done={savedDone} onPress={() => void save()} className={className}>
      {t.ui.common.saveRecipe}
    </Button>
  );
  const close = (
    <Button variant="quiet" icon="close" onPress={() => navigate('/')} className="px-[.8rem]">
      {t.ui.common.close}
    </Button>
  );

  if (desktop)
    return (
      <div className="flex h-dvh flex-col">
        <header className="flex items-center gap-4 border-b border-line px-7 py-4">
          {close}
          <h1 className="text-xl">{r.title}</h1>
          {toCheck && <span className="text-ink-muted">{toCheck}</span>}
          <span className="ml-auto">{saveButton('L', 'pr-[1.3rem] pl-[1rem]')}</span>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-5 overflow-y-auto px-7 py-6">
          <div className="flex flex-col gap-4">
            {details}
            {tips}
            {story}
          </div>
          {ingredients}
          {stepsCard}
        </div>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2">{close}</div>
      <div className="flex flex-col gap-2 px-5 pt-4.5">
        <h1 className="text-2xl leading-[1.1] tracking-[-0.015em]">{r.title}</h1>
        <p className="text-ink-muted">
          {r.tapToFix} {toCheck && <>{toCheck}.</>}
        </p>
      </div>
      <div className="flex flex-col gap-3.5 px-3.5 pt-4.5 pb-6">
        {details}
        {ingredients}
        {stepsCard}
        {tips}
      </div>
      <SaveBar>{saveButton('XL', 'w-full')}</SaveBar>
    </div>
  );
}
