import { newId } from '../../db/db';
import type { Ingredient, Recipe, Step } from '../../db/types';
import { en } from '../../i18n/en';
import { checkIngredient } from '../../lib/parse/check';
import { parseCommand, splitOnSeparator, type Command } from '../../lib/parse/commands';
import { parseIngredient } from '../../lib/parse/ingredient';
import { findNumber } from '../../lib/parse/numbers';
import { cleanStep } from '../../lib/parse/steps';
import { stepTimer } from '../../lib/parse/timers';

/** The questions of Tell it, in order. Review comes after the last. */
export const TELL_STAGES = ['title', 'author', 'servings', 'ingredients', 'steps', 'tips', 'story'] as const;
export type TellStage = (typeof TELL_STAGES)[number];

/** Stages answered in one go: an answer moves straight on to the next question. */
const SHORT: readonly TellStage[] = ['title', 'author', 'servings'];

export function isTellStage(s: string | undefined): s is TellStage {
  return (TELL_STAGES as readonly string[]).includes(s ?? '');
}

export function isShortStage(stage: TellStage): boolean {
  return SHORT.includes(stage);
}

/** Where Tell it is: the recipe so far, and what's still being said. */
export interface TellState {
  stage: TellStage;
  recipe: Partial<Recipe>;
  /** The ingredient section being told ("For the marinade"). */
  section?: string;
  /** The step being told, not yet closed with "next". */
  open?: string;
}

/**
 * What hearing something did.
 * - `changed`: the state is new (save it; keep the old one for Undo last).
 * - `advance`: this question is answered, so move on. `finish`: that was the last one, go to Review.
 * - `undo`, `back`, `stop`: commands for the page.
 * - `unclear`: nothing usable was heard for this question (a servings answer with no number).
 */
export type Heard =
  | { kind: 'changed'; state: TellState; newId?: string; advance?: boolean }
  | { kind: 'advance'; state: TellState }
  | { kind: 'finish'; state: TellState }
  | { kind: 'undo' | 'back' | 'stop' | 'unclear' | 'nothing' };

const STORY_PROMPT = en.story.prompts[0]!;

function join(a: string | undefined, b: string): string {
  return a?.trim() ? `${a.trim()} ${b.trim()}` : b.trim();
}

function capitalise(s: string): string {
  const t = s.trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : t;
}

/** "it's chicken biryani." → "Chicken biryani". */
export function cleanTitle(text: string): string {
  const s = text
    .trim()
    .replace(/^(?:(?:it'?s|it is|this is|that'?s|we call it|it'?s called|called)\s+)+/i, '')
    .replace(/[.!?,\s]+$/, '');
  return capitalise(s);
}

/** "it's my mom's recipe" → "My mom". */
export function cleanAuthor(text: string): string {
  const s = text
    .trim()
    .replace(/^(?:(?:it'?s|it is|this is|that'?s|from|it was|it came from)\s+)+/i, '')
    .replace(/[.!?,\s]+$/, '')
    .replace(/(?:['’]s)?\s+recipe$/i, '')
    .replace(/['’]s$/i, '');
  return capitalise(s);
}

/** "for the marinade" → "Marinade"; anything with an amount is an ingredient, not a section. */
export function spokenSection(text: string): string | undefined {
  const m = /^(?:and\s+)?(?:for|4)\s+the\s+(.+)$/i.exec(text.trim().replace(/[.:,\s]+$/, ''));
  if (!m || /\d/.test(m[1]!) || m[1]!.split(/\s+/).length > 4) return undefined;
  return capitalise(m[1]!);
}

function closeStep(state: TellState): { state: TellState; id?: string } {
  const text = cleanStep(state.open ?? '');
  if (!text) return { state: { ...state, open: undefined } };
  const timerSeconds = stepTimer(text);
  const step: Step = { id: newId(), text, ...(timerSeconds ? { timerSeconds } : {}) };
  return { state: { ...state, open: undefined, recipe: { ...state.recipe, steps: [...(state.recipe.steps ?? []), step] } }, id: step.id };
}

/** The same state with the step being told written down (before leaving Tell it). */
export function closeOpen(state: TellState): TellState {
  return closeStep(state).state;
}

/** Close anything still open and move to the next question (or Review after the last). */
export function advance(state: TellState): { state: TellState; finished: boolean } {
  const closed = closeStep(state).state;
  const i = TELL_STAGES.indexOf(state.stage);
  const next = TELL_STAGES[i + 1];
  if (!next) return { state: closed, finished: true };
  return { state: { ...closed, stage: next }, finished: false };
}

function withTranscript(recipe: Partial<Recipe>, text: string): Partial<Recipe> {
  return { ...recipe, transcript: recipe.transcript ? `${recipe.transcript}\n${text.trim()}` : text.trim() };
}

function onCommand(state: TellState, command: Command): Heard {
  switch (command.type) {
    case 'undo':
      return { kind: 'undo' };
    case 'back':
      return { kind: 'back' };
    case 'stop':
      return { kind: 'stop' };
    case 'done': {
      const r = advance(state);
      return r.finished ? { kind: 'finish', state: r.state } : { kind: 'advance', state: r.state };
    }
    case 'next': {
      // Between ingredients "next" is only a separator; after a step it closes the step.
      if (state.stage === 'ingredients') return { kind: 'nothing' };
      if (state.stage === 'steps') {
        if (!state.open?.trim()) return { kind: 'nothing' };
        const c = closeStep(state);
        return { kind: 'changed', state: c.state, newId: c.id };
      }
      const r = advance(state);
      return r.finished ? { kind: 'finish', state: r.state } : { kind: 'advance', state: r.state };
    }
    default:
      return { kind: 'nothing' };
  }
}

/**
 * Something was heard (a whole final phrase) while answering `state.stage`. Commands on their own
 * ("next", "done", "undo") steer; anything else answers the question.
 */
export function hear(state: TellState, text: string): Heard {
  const said = text.trim();
  if (!said) return { kind: 'nothing' };
  const command = parseCommand(said);
  if (command && command.type !== 'setTimer' && command.type !== 'startTimer' && command.type !== 'ingredients')
    return onCommand(state, command);

  const recipe = withTranscript(state.recipe, said);
  switch (state.stage) {
    case 'title': {
      const title = cleanTitle(said);
      if (!title) return { kind: 'unclear' };
      return { kind: 'changed', state: { ...state, recipe: { ...recipe, title } }, advance: true };
    }
    case 'author': {
      const author = cleanAuthor(said);
      if (!author) return { kind: 'unclear' };
      return { kind: 'changed', state: { ...state, recipe: { ...recipe, author } }, advance: true };
    }
    case 'servings': {
      const n = findNumber(said);
      if (!n || n < 1) return { kind: 'unclear' };
      return { kind: 'changed', state: { ...state, recipe: { ...recipe, servings: Math.round(n) } }, advance: true };
    }
    case 'ingredients': {
      let section = state.section;
      const added: Ingredient[] = [];
      for (const part of splitOnSeparator(said)) {
        if (!part) continue;
        const heading = spokenSection(part);
        if (heading) {
          section = heading;
          continue;
        }
        const parsed = parseIngredient(part);
        if (!parsed.name) continue;
        const check = checkIngredient(part, parsed);
        added.push({ id: newId(), ...parsed, ...(section ? { section } : {}), ...(check ? { check } : {}) });
      }
      if (!added.length && section === state.section) return { kind: 'nothing' };
      const ingredients = [...(state.recipe.ingredients ?? []), ...added];
      return { kind: 'changed', state: { ...state, section, recipe: { ...recipe, ingredients } }, newId: added.at(-1)?.id };
    }
    case 'steps': {
      // "fry the onions next add the chicken" closes the first step and opens the second.
      let next: TellState = { ...state, recipe };
      let id: string | undefined;
      splitOnSeparator(said).forEach((part, i) => {
        if (i > 0) {
          const c = closeStep(next);
          next = c.state;
          id = c.id ?? id;
        }
        if (part) next = { ...next, open: join(next.open, part) };
      });
      return { kind: 'changed', state: next, newId: id };
    }
    case 'tips': {
      const tip = cleanStep(said);
      return { kind: 'changed', state: { ...state, recipe: { ...recipe, tips: join(state.recipe.tips, tip) } } };
    }
    case 'story': {
      const story = state.recipe.story?.length ? state.recipe.story : [{ prompt: STORY_PROMPT, answer: '' }];
      const answer = capitalise(join(story[0]!.answer, said));
      return {
        kind: 'changed',
        state: { ...state, recipe: { ...recipe, story: story.map((s, i) => (i === 0 ? { ...s, answer } : s)) } },
      };
    }
  }
}

/** 1-based position of a stage, for "Ingredients · step 4 of 7". */
export function stageNumber(stage: TellStage): number {
  return TELL_STAGES.indexOf(stage) + 1;
}
