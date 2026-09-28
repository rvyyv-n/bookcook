import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type Ref } from 'react';
import { newId } from '../../db/db';
import { putMedia } from '../../db/media';
import { knownIngredientNames } from '../../db/recipes';
import type { Ingredient, Recipe, Step, StoryAnswer } from '../../db/types';
import { spiceGroups } from '../../design/skin';
import { useT } from '../../i18n';
import { splitOnSeparator } from '../../lib/parse/commands';
import { ingredientParts, parseIngredient, sectionHeading } from '../../lib/parse/ingredient';
import { segmentStep } from '../../lib/parse/segments';
import { formatClock, formatDuration, stepTimer } from '../../lib/parse/timers';
import type { ParseCheck } from '../../lib/parse/types';
import { compressImage } from '../../lib/platform/image';
import { canRecord, startRecording, type Recording } from '../../lib/platform/recorder';
import { AudioPlayer } from '../../ui/AudioPlayer';
import { Button } from '../../ui/Button';
import { Stepper } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { useDictation } from '../../ui/dictation';
import {
  CheckNote,
  DeskPhotoPicker,
  GrowingTextArea,
  HeroPhotoPicker,
  IngredientLineField,
  MetaPill,
  MoveHandle,
  OutlineButton,
  PhotoButton,
  RecordButton,
  StepPhotoAdded,
  StepRichText,
  StepRow,
  StepTextButton,
  type StepPart,
} from '../../ui/Editor';
import { TextField } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { useReorder } from '../../ui/useReorder';
import { minutesText, newStep, parseMinutes, splitTags, suggestForLine, type IngredientLine } from './model';
import type { EditorState } from './useDraftEditor';

type Update = (fn: (s: EditorState) => EditorState, opts?: { record?: boolean; key?: string }) => void;
type SetRecipe = (patch: Partial<Recipe>, opts?: { record?: boolean; key?: string }) => void;

/** What the sections need from the draft editor. */
export interface EditorApi {
  state: EditorState;
  update: Update;
  setRecipe: SetRecipe;
}

type T = ReturnType<typeof useT>;

/** "Check this · heard “haldi”" */
export function checkText(t: T, check: ParseCheck): string {
  const r = t.ui.review.reasons;
  const why = check.reason === 'unknownWord' ? r.unknownWord(check.heard ?? '') : r[check.reason];
  return `${t.ui.review.checkThis} · ${why}`;
}

/** A line that is (or is becoming) a section heading: "For the rice:", or just ":" from the Section button. */
export const isHeadingLine = (text: string) => sectionHeading(text) !== undefined || /^\s*:\s*$/.test(text);

/** Where to put the caret once a line or step has rendered. */
function useFocusAfterRender<E extends HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>() {
  const els = useRef(new Map<string, E>());
  const want = useRef<{ id: string; caret: number | 'end' } | null>(null);
  const [, bump] = useState(0);
  useLayoutEffect(() => {
    const w = want.current;
    const el = w && els.current.get(w.id);
    if (!w || !el) return;
    want.current = null;
    el.focus();
    if (!(el instanceof HTMLButtonElement)) {
      const c = w.caret === 'end' ? el.value.length : w.caret;
      el.setSelectionRange(c, c);
    }
  });
  return {
    ref: (id: string) => (el: E | null) => {
      if (el) els.current.set(id, el);
      else els.current.delete(id);
    },
    focus: (id: string, caret: number | 'end' = 'end') => {
      want.current = { id, caret };
      bump((n) => n + 1);
    },
    get: (id: string) => els.current.get(id),
  };
}

// Details

/** A time typed as words ("1 hr 15 min") and stored as minutes. Shows the tidy form when not being edited. */
function useTimeText(value: number | undefined, onChange: (minutes: number | undefined) => void) {
  const [text, setText] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  return {
    value: text ?? minutesText(value),
    isInvalid: invalid,
    onChange: (v: string) => {
      setText(v);
      setInvalid(false);
      onChange(parseMinutes(v));
    },
    onFocus: () => setText((cur) => cur ?? minutesText(value)),
    onBlur: () => {
      const bad = !!text?.trim() && parseMinutes(text) === undefined;
      setInvalid(bad);
      if (!bad) setText(null);
    },
  };
}

/** Tags typed as "Eid, rice". */
function useTagText(tags: string[], onChange: (tags: string[]) => void) {
  const [text, setText] = useState<string | null>(null);
  return {
    value: text ?? tags.join(', '),
    onChange: (v: string) => {
      setText(v);
      onChange(splitTags(v));
    },
    onFocus: () => setText((cur) => cur ?? tags.join(', ')),
    onBlur: () => setText(null),
  };
}

function usePickPhoto(update: Update) {
  return async (file: File) => {
    const id = await putMedia(await compressImage(file), 'photo');
    update((s) => ({ ...s, recipe: { ...s.recipe, photoIds: [id, ...(s.recipe.photoIds ?? []).slice(1)] } }));
  };
}

/** Recipe name, whose recipe, serves, prep and cook, tags. `photo` adds the phone's hero photo on top. */
export function DetailsFields({
  ed,
  nameError,
  titleRef,
  photo = true,
  className,
}: {
  ed: EditorApi;
  nameError: boolean;
  titleRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
  photo?: boolean;
  className?: string;
}) {
  const t = useT();
  const e = t.ui.editor;
  const recipe = ed.state.recipe;
  const set = ed.setRecipe;
  const prep = useTimeText(recipe.prepMinutes, (m) => set({ prepMinutes: m }));
  const cook = useTimeText(recipe.cookMinutes, (m) => set({ cookMinutes: m }));
  const tags = useTagText(recipe.tags ?? [], (v) => set({ tags: v }));
  const pick = usePickPhoto(ed.update);
  return (
    <div className={className ?? 'flex flex-col gap-5 px-5 pt-4.5 pb-6'}>
      {photo && (
        <HeroPhotoPicker
          id={recipe.photoIds?.[0]}
          label={recipe.photoIds?.length ? e.changePhoto : e.addPhoto}
          onPick={(f) => void pick(f)}
        />
      )}
      <TextField
        label={e.recipeName}
        value={recipe.title ?? ''}
        onChange={(v) => set({ title: v })}
        isInvalid={nameError && !recipe.title?.trim()}
        errorMessage={e.nameNeeded}
        inputRef={titleRef}
        inputClassName="type-display py-2.5 text-xl! leading-[1.15]"
      />
      <TextField label={e.whose} prefix={e.from} suffix={e.kitchen} value={recipe.author ?? ''} onChange={(v) => set({ author: v })} />
      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="font-bold">
          {e.serves}
        </span>
        <Stepper
          label={e.serves}
          value={recipe.servings ?? 4}
          onChange={(n) => set({ servings: n })}
          format={e.people}
          decrementLabel={t.ui.recipe.fewerServings}
          incrementLabel={t.ui.recipe.moreServings}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] items-start gap-3.5">
        <TextField label={e.prep} {...prep} errorMessage={e.timeError} />
        <TextField label={e.cook} {...cook} errorMessage={e.timeError} />
      </div>
      <TextField label={e.tags} description={e.tagsHint} {...tags} />
    </div>
  );
}

/** Desktop: the 200px photo, the title field and the meta pills (From Mom’s kitchen · Serves 6 · Prep · Cook · Tags). */
export function DeskDetails({
  ed,
  nameError,
  titleRef,
}: {
  ed: EditorApi;
  nameError: boolean;
  titleRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
}) {
  const t = useT();
  const e = t.ui.editor;
  const recipe = ed.state.recipe;
  const set = ed.setRecipe;
  const prep = useTimeText(recipe.prepMinutes, (m) => set({ prepMinutes: m }));
  const cook = useTimeText(recipe.cookMinutes, (m) => set({ cookMinutes: m }));
  const tags = useTagText(recipe.tags ?? [], (v) => set({ tags: v }));
  const pick = usePickPhoto(ed.update);
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] items-center gap-6">
      <DeskPhotoPicker
        id={recipe.photoIds?.[0]}
        label={recipe.photoIds?.length ? e.changePhoto : e.addPhoto}
        onPick={(f) => void pick(f)}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <TextField
          label={e.recipeName}
          labelHidden
          value={recipe.title ?? ''}
          onChange={(v) => set({ title: v })}
          isInvalid={nameError && !recipe.title?.trim()}
          errorMessage={e.nameNeeded}
          inputRef={titleRef}
          inputClassName="type-display min-h-[3.8rem] px-4! text-2xl! leading-[1.1]"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <MetaPill before={e.from} after={e.kitchen} label={e.whose} value={recipe.author ?? ''} onChange={(v) => set({ author: v })} />
          <MetaPill
            before={e.serves}
            inputMode="numeric"
            value={recipe.servings ? String(recipe.servings) : ''}
            onChange={(v) => {
              const n = parseInt(v, 10);
              set({ servings: n > 0 ? Math.min(n, 99) : undefined });
            }}
          />
          <MetaPill before={e.prep} {...prep} />
          <MetaPill before={e.cook} {...cook} />
          <MetaPill before={e.tags} {...tags} />
        </div>
      </div>
    </div>
  );
}

// Ingredients

/**
 * The ingredient lines, typed the way you'd say them. Enter starts a new line, a line ending in ":" is a
 * section, pasting several lines makes several lines, and a line emptied and left is deleted (with Undo).
 * `dense` is the desktop's shorter rows with a "Next line…" row at the end instead of the buttons.
 */
export function IngredientsEditor({ ed, dense = false }: { ed: EditorApi; dense?: boolean }) {
  const t = useT();
  const e = t.ui.editor;
  const toast = useToast();
  const dictation = useDictation();
  const known = useLiveQuery(knownIngredientNames, [], []);
  const lines = ed.state.lines;
  const focus = useFocusAfterRender<HTMLInputElement>();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const original = useRef('');
  const [listening, setListening] = useState<{ stop(): void } | null>(null);
  const [partial, setPartial] = useState('');
  const session = useRef(listening);
  useEffect(() => {
    session.current = listening;
  });
  useEffect(() => () => session.current?.stop(), []);

  const groups = useMemo(() => spiceGroups(lines.map((l) => sectionHeading(l.text))), [lines]);
  const setLines = (fn: (ls: IngredientLine[]) => IngredientLine[], key?: string) =>
    ed.update((s) => ({ ...s, lines: fn(s.lines) }), { key });
  const setText = (id: string, text: string) => setLines((ls) => ls.map((l) => (l.id === id ? { id, text } : l)), `line:${id}`);
  const replaceAt = (id: string, withLines: IngredientLine[]) =>
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      return i < 0 ? ls : [...ls.slice(0, i), ...withLines, ...ls.slice(i + 1)];
    });

  function deleted(text: string, index: number) {
    toast.undo(e.lineDeleted(text), () =>
      setLines((ls) => [...ls.slice(0, Math.min(index, ls.length)), { id: newId(), text }, ...ls.slice(Math.min(index, ls.length))]),
    );
  }

  function keyDown(line: IngredientLine, index: number, ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.nativeEvent.isComposing) return;
    const el = ev.currentTarget;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const at = el.selectionStart ?? line.text.length;
      const before = line.text.slice(0, at).trimEnd();
      const next = { id: newId(), text: line.text.slice(at).trimStart() };
      replaceAt(line.id, [before === line.text ? line : { id: line.id, text: before }, next]);
      focus.focus(next.id, 0);
    } else if (ev.key === 'Backspace' && !line.text && lines.length > 1) {
      ev.preventDefault();
      const was = original.current;
      original.current = '';
      setLines((ls) => ls.filter((l) => l.id !== line.id));
      if (was.trim() && !isHeadingLine(was)) deleted(was, index);
      const to = lines[index - 1] ?? lines[index + 1];
      if (to) focus.focus(to.id);
    } else if (ev.key === 'ArrowUp' && index > 0) {
      ev.preventDefault();
      focus.focus(lines[index - 1]!.id);
    } else if (ev.key === 'ArrowDown' && index < lines.length - 1) {
      ev.preventDefault();
      focus.focus(lines[index + 1]!.id);
    } else if (ev.key === 'ArrowDown' && dense) {
      ev.preventDefault();
      focus.get('ghost')?.focus();
    }
  }

  function blur(line: IngredientLine, index: number) {
    setFocusedId((f) => (f === line.id ? null : f));
    const was = original.current;
    original.current = '';
    if (line.text.trim() && !/^\s*:\s*$/.test(line.text)) return;
    // An emptied line goes (the only line stays, ready for typing).
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== line.id) : ls), `line:${line.id}`);
    if (lines.length > 1 && was.trim() && !/^\s*:\s*$/.test(was)) deleted(was, index);
  }

  function paste(line: IngredientLine, ev: ClipboardEvent<HTMLInputElement>) {
    const text = ev.clipboardData.getData('text/plain');
    if (!text.includes('\n')) return;
    const pieces = text
      .replace(/\r/g, '')
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!pieces.length) return;
    ev.preventDefault();
    const el = ev.currentTarget;
    const a = el.selectionStart ?? line.text.length;
    const b = el.selectionEnd ?? a;
    const merged = [line.text.slice(0, a) + pieces[0], ...pieces.slice(1)];
    merged[merged.length - 1] += line.text.slice(b);
    const made = merged.map((text, i) => ({ id: i === 0 ? line.id : newId(), text }));
    replaceAt(line.id, made);
    focus.focus(made.at(-1)!.id);
  }

  function addLine(text = '', caret: number | 'end' = 'end') {
    const last = lines.at(-1);
    if (last && !last.text.trim() && !text) return focus.focus(last.id);
    const line = { id: newId(), text };
    setLines((ls) => [...ls.filter((l, i) => i < ls.length - 1 || l.text.trim()), line]);
    focus.focus(line.id, caret);
  }

  function toggleSpeak() {
    if (listening) return listening.stop();
    if (!dictation) return;
    setListening(
      dictation.listen({
        onPartial: setPartial,
        onFinal: (text) => {
          setPartial('');
          const items = splitOnSeparator(text).filter(Boolean);
          if (items.length)
            setLines((ls) => [...ls.filter((l, i) => i < ls.length - 1 || l.text.trim()), ...items.map((x) => ({ id: newId(), text: x }))]);
        },
        onEnd: () => {
          setListening(null);
          setPartial('');
        },
      }),
    );
  }

  const focused = lines.find((l) => l.id === focusedId);
  const suggestions = focused && !isHeadingLine(focused.text) ? suggestForLine(focused.text, known) : [];
  let n = 0;
  const lastEmpty = !lines.at(-1)?.text.trim();

  return (
    <div className={dense ? 'flex flex-col' : 'flex flex-col gap-0.5 px-5 pt-3.5 pb-6'}>
      {lines.map((line, i) => {
        const heading = isHeadingLine(line.text);
        if (!heading) n++;
        const isFocused = line.id === focusedId;
        return (
          <IngredientLineField
            key={line.id}
            inputRef={focus.ref(line.id)}
            value={line.text}
            label={heading ? e.section : e.ingredientLine(n)}
            placeholder={e.nextLine}
            heading={heading}
            spiceGroup={heading ? groups.get(sectionHeading(line.text) ?? '') : undefined}
            preview={isFocused ? ingredientParts(parseIngredient(line.text)) : undefined}
            suggestions={isFocused ? suggestions.map((s) => s.label) : []}
            suggestionsLabel={e.suggestions}
            onPick={(k) => {
              setText(line.id, suggestions[k]!.text);
              focus.focus(line.id);
            }}
            onChange={(v) => setText(line.id, v)}
            onKeyDown={(ev) => keyDown(line, i, ev)}
            onFocus={() => {
              setFocusedId(line.id);
              original.current = line.text;
            }}
            onBlur={() => blur(line, i)}
            onPaste={(ev) => paste(line, ev)}
            dense={dense}
            check={line.check && <CheckNote>{checkText(t, line.check)}</CheckNote>}
          />
        );
      })}
      {partial && (
        <p aria-live="polite" className="flex min-h-14 items-center text-ink-muted">
          {partial}
        </p>
      )}
      {dense && !lastEmpty && (
        <IngredientLineField
          inputRef={focus.ref('ghost')}
          value=""
          label={e.nextLine}
          placeholder={e.nextLine}
          dense
          onChange={(v) => addLine(v)}
          onKeyDown={(ev) => {
            if (ev.key === 'ArrowUp' && lines.length) {
              ev.preventDefault();
              focus.focus(lines.at(-1)!.id);
            }
          }}
        />
      )}
      {!dense && (
        <div className="flex flex-wrap gap-2.5 pt-4">
          <OutlineButton icon="add" onPress={() => addLine()}>
            {e.line}
          </OutlineButton>
          <OutlineButton icon="section" onPress={() => addLine(':', 0)}>
            {e.section}
          </OutlineButton>
          {dictation && (
            <Button
              variant="quiet"
              icon={listening ? 'stop' : 'mic'}
              aria-pressed={!!listening}
              onPress={toggleSpeak}
              className="pr-[1rem] pl-[.7rem]"
            >
              {listening ? t.ui.common.stop : t.ui.common.speak}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Steps

function withText(step: Step, text: string): Step {
  const { check: _check, timerSeconds: _timer, ...rest } = step;
  const seconds = stepTimer(text);
  return seconds ? { ...rest, text, timerSeconds: seconds } : { ...rest, text };
}

/** Step text split into plain words, mentions (in their section's colour) and timer chips. */
function stepParts(text: string, ingredients: Ingredient[], groups: Map<string, number>): StepPart[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return segmentStep(text, ingredients).map((s) => {
    if (s.duration) return { text: s.text, timer: formatDuration(s.duration.seconds) };
    const section = s.ingredientId ? byId.get(s.ingredientId)?.section : undefined;
    if (s.ingredientId) return { text: s.text, mention: { spiceGroup: section ? groups.get(section) : undefined } };
    return { text: s.text };
  });
}

/**
 * The steps: tap one to edit it, Enter starts the next, an emptied step is deleted when you leave it
 * (with Undo). Move drags or opens Up / Down. Mentions and timer chips are found as you type.
 */
export function StepsEditor({ ed, ingredients, dense = false }: { ed: EditorApi; ingredients: Ingredient[]; dense?: boolean }) {
  const t = useT();
  const e = t.ui.editor;
  const toast = useToast();
  const steps = ed.state.recipe.steps ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const editingRef = useRef<string | null>(null);
  const original = useRef('');
  const areas = useFocusAfterRender<HTMLTextAreaElement>();
  const moves = useFocusAfterRender<HTMLButtonElement>();
  const groups = useMemo(() => spiceGroups(ingredients.map((i) => i.section)), [ingredients]);

  const setSteps = (fn: (s: Step[]) => Step[], key?: string) =>
    ed.update((s) => ({ ...s, recipe: { ...s.recipe, steps: fn(s.recipe.steps ?? []) } }), { key });
  const setText = (id: string, text: string) => setSteps((ls) => ls.map((s) => (s.id === id ? withText(s, text) : s)), `step:${id}`);

  function edit(step: Step, caret: number | 'end' = 'end') {
    original.current = step.text;
    editingRef.current = step.id;
    setEditing(step.id);
    areas.focus(step.id, caret);
  }

  function move(from: number, to: number) {
    const id = steps[from]?.id;
    if (!id || to < 0 || to >= steps.length) return;
    setSteps((ls) => {
      const copy = [...ls];
      const [s] = copy.splice(from, 1);
      copy.splice(to, 0, s!);
      return copy;
    });
    moves.focus(id);
  }
  const reorder = useReorder(move);

  function keyDown(step: Step, index: number, ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.nativeEvent.isComposing) return;
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      if (!step.text.trim()) return;
      const at = ev.currentTarget.selectionStart ?? step.text.length;
      const next = withText(newStep(), step.text.slice(at).trimStart());
      setSteps((ls) => ls.flatMap((s) => (s.id === step.id ? [withText(s, step.text.slice(0, at).trimEnd()), next] : [s])));
      edit(next, 0);
    } else if (ev.key === 'Backspace' && !step.text && !step.photoId && steps.length > 1) {
      ev.preventDefault();
      const was = original.current;
      editingRef.current = null;
      setSteps((ls) => ls.filter((s) => s.id !== step.id));
      if (was.trim()) stepGone(was, index);
      const prev = steps[index - 1];
      if (prev) edit(prev);
      else setEditing(null);
    } else if (ev.key === 'Escape') {
      ev.currentTarget.blur();
    }
  }

  function stepGone(text: string, index: number) {
    toast.undo(e.stepDeleted(index + 1), () =>
      setSteps((ls) => [...ls.slice(0, Math.min(index, ls.length)), withText(newStep(), text), ...ls.slice(Math.min(index, ls.length))]),
    );
  }

  function blur(step: Step, index: number) {
    if (editingRef.current !== step.id) return;
    editingRef.current = null;
    setEditing(null);
    const was = original.current;
    if (step.text.trim() || step.photoId) return;
    setSteps((ls) => ls.filter((s) => s.id !== step.id));
    if (was.trim()) stepGone(was, index);
  }

  async function addPhoto(id: string, file: File) {
    const photoId = await putMedia(await compressImage(file), 'photo');
    setSteps((ls) => ls.map((s) => (s.id === id ? { ...s, photoId } : s)));
  }

  function removePhoto(step: Step) {
    const old = step.photoId;
    const drop = (s: Step): Step => {
      const { photoId: _p, ...rest } = s;
      return rest;
    };
    setSteps((ls) => ls.map((s) => (s.id === step.id ? drop(s) : s)));
    toast.undo(e.stepPhotoRemoved, () => setSteps((ls) => ls.map((s) => (s.id === step.id ? { ...s, photoId: old } : s))));
  }

  function addStep() {
    const step = newStep();
    setSteps((ls) => [...ls.filter((s) => s.text.trim() || s.photoId), step]);
    edit(step, 0);
  }

  return (
    <div className={dense ? 'flex flex-col' : 'flex flex-col px-3 pt-2 pb-6'}>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            numeral={i + 1}
            dense={dense}
            rowRef={reorder.rowRef(i)}
            style={reorder.rowStyle(i)}
            lifted={reorder.dragging === i}
            move={
              <MoveHandle
                label={e.moveStep(i + 1)}
                word={e.move}
                upLabel={e.up}
                downLabel={e.down}
                canUp={i > 0}
                canDown={i < steps.length - 1}
                onUp={() => move(i, i - 1)}
                onDown={() => move(i, i + 1)}
                dragProps={reorder.handleProps(i)}
                wasTap={reorder.wasTap}
                buttonRef={moves.ref(step.id)}
              />
            }
          >
            {editing === step.id ? (
              <GrowingTextArea
                textRef={areas.ref(step.id)}
                value={step.text}
                onChange={(v) => setText(step.id, v)}
                label={e.step(i + 1)}
                placeholder={e.stepPlaceholder}
                onKeyDown={(ev) => keyDown(step, i, ev)}
                onBlur={() => blur(step, i)}
              />
            ) : (
              <StepTextButton label={`${e.step(i + 1)}: ${step.text}`} onPress={() => edit(step)}>
                {step.text ? (
                  <StepRichText parts={stepParts(step.text, ingredients, groups)} />
                ) : (
                  <span className="text-ink-muted">{e.stepPlaceholder}</span>
                )}
              </StepTextButton>
            )}
            {step.photoId ? (
              <StepPhotoAdded id={step.photoId} label={e.stepPhotoAdded} removeLabel={e.removePhoto} onRemove={() => removePhoto(step)} />
            ) : (
              <PhotoButton onPick={(f) => void addPhoto(step.id, f)} className="self-start">
                {e.addPhoto}
              </PhotoButton>
            )}
          </StepRow>
        ))}
      </ol>
      <OutlineButton icon="add" onPress={addStep} className={cx('mt-4 self-start', !dense && 'ml-2')}>
        {e.addStep}
      </OutlineButton>
    </div>
  );
}

// Story and tips

/** Record a voice note: start, the running time, stop; the note is stored and handed to `onSaved`. */
export function useVoiceNote(onSaved: (id: string) => void) {
  const t = useT();
  const toast = useToast();
  const [rec, setRec] = useState<{ recording: Recording; startedAt: number } | null>(null);
  const [now, setNow] = useState(0);
  const live = useRef(rec);
  useEffect(() => {
    live.current = rec;
  });
  useEffect(() => () => live.current?.recording.cancel(), []);
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rec]);

  async function toggle() {
    if (rec) {
      setRec(null);
      const blob = await rec.recording.stop();
      if (blob.size) onSaved(await putMedia(blob, 'audio'));
      return;
    }
    try {
      const recording = await startRecording();
      const at = Date.now();
      setNow(at);
      setRec({ recording, startedAt: at });
    } catch {
      toast.show({ message: t.ui.editor.micBlocked, timeout: 8000 });
    }
  }
  return { available: canRecord(), recording: !!rec, elapsed: rec ? Math.max(0, (now - rec.startedAt) / 1000) : 0, toggle };
}

/** "Who taught you this?" (and any other story answers), its voice note, the tips, and Record a voice note. */
export function StoryEditor({ ed, desk = false }: { ed: EditorApi; desk?: boolean }) {
  const t = useT();
  const e = t.ui.editor;
  const toast = useToast();
  const recipe = ed.state.recipe;
  const first = t.story.prompts[0]!;
  const story: StoryAnswer[] = recipe.story?.length ? recipe.story : [{ prompt: first, answer: '' }];
  const setStory = (fn: (s: StoryAnswer[]) => StoryAnswer[], key?: string) =>
    ed.update(
      (s) => ({ ...s, recipe: { ...s.recipe, story: fn(s.recipe.story?.length ? s.recipe.story : [{ prompt: first, answer: '' }]) } }),
      { key },
    );
  const note = useVoiceNote((id) => {
    const old = story[0]?.audioId;
    setStory((s) => s.map((a, i) => (i === 0 ? { ...a, audioId: id } : a)));
    if (old) toast.undo(e.noteReplaced, () => setStory((s) => s.map((a, i) => (i === 0 ? { ...a, audioId: old } : a))));
    else toast.show({ message: e.noteSaved, tone: 'success' });
  });
  const player = { playLabel: t.ui.recipe.play, pauseLabel: t.ui.recipe.pause };

  const storyFields = story.map((s, i) => (
    <div key={i} className="flex flex-col gap-3">
      <TextField
        multiline
        rows={3}
        label={s.prompt}
        value={s.answer}
        onChange={(v) => setStory((all) => all.map((a, j) => (j === i ? { ...a, answer: v } : a)), `story:${i}`)}
        inputClassName="font-(family-name:--font-display) text-lg leading-[1.35] italic [font-variation-settings:var(--font-display-settings)]"
      />
      {s.audioId && <AudioPlayer id={s.audioId} label={`${e.voiceNote}: ${s.prompt}`} {...player} />}
    </div>
  ));
  const tips = (
    <div className="flex flex-col gap-3">
      <TextField multiline rows={2} label={e.tips} value={recipe.tips ?? ''} onChange={(v) => ed.setRecipe({ tips: v })} />
      {recipe.tipsAudioId && <AudioPlayer id={recipe.tipsAudioId} label={`${e.voiceNote}: ${e.tips}`} {...player} />}
    </div>
  );
  const record = note.available && (
    <RecordButton recording={note.recording} onPress={() => void note.toggle()}>
      {note.recording ? e.stopRecording(formatClock(note.elapsed)) : e.recordNote}
    </RecordButton>
  );
  if (desk)
    return (
      <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-start gap-10">
        <div className="flex flex-col gap-5.5">{storyFields}</div>
        <div className="flex flex-col gap-5.5">
          {tips}
          {record}
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-5.5 px-5 pt-4.5 pb-6">
      {storyFields}
      {tips}
      {record}
    </div>
  );
}
