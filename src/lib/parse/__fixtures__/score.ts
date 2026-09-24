/**
 * Scores the parser against the fixture corpus. Used by `npm run parse:score` and the test suite.
 */
import { classifyLine, parseMonologue } from '../classify';
import { parseCommand } from '../commands';
import { parseIngredient } from '../ingredient';
import { parsePaste } from '../paste';
import { splitSteps } from '../steps';
import { stepTimer } from '../timers';
import type { ParsedIngredient } from '../types';
import classifyCases from './classify.json';
import commandCases from './commands.json';
import holdoutCases from './holdout.json';
import ingredientCases from './ingredients.json';
import monologueCases from './monologue.json';
import pasteCases from './paste.json';
import stepCases from './steps.json';
import timerCases from './timers.json';

export interface CaseResult {
  suite: string;
  input: string;
  pass: boolean;
  detail?: string;
}

function eqQuantity(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 0.01);
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.01;
  return a === b;
}

function norm(s: string | undefined): string | undefined {
  return s === undefined ? undefined : s.toLowerCase().trim();
}

function ingredientMatches(actual: ParsedIngredient, expected: Partial<ParsedIngredient>): boolean {
  return (
    eqQuantity(actual.quantity, expected.quantity) &&
    actual.unit === expected.unit &&
    norm(actual.name) === norm(expected.name) &&
    norm(actual.note) === norm(expected.note)
  );
}

export function runFixtures(): CaseResult[] {
  const results: CaseResult[] = [];

  for (const c of ingredientCases) {
    const actual = parseIngredient(c.input);
    const pass = ingredientMatches(actual, c.expected as Partial<ParsedIngredient>);
    results.push({ suite: `ingredients (${c.source})`, input: c.input, pass, detail: pass ? undefined : JSON.stringify(actual) });
  }

  for (const c of holdoutCases) {
    const actual = parseIngredient(c.input);
    const pass = ingredientMatches(actual, c.expected as Partial<ParsedIngredient>);
    results.push({ suite: 'ingredients (held out)', input: c.input, pass, detail: pass ? undefined : JSON.stringify(actual) });
  }

  for (const c of timerCases) {
    const actual = stepTimer(c.input) ?? null;
    results.push({ suite: 'timers', input: c.input, pass: actual === c.seconds, detail: `got ${actual}` });
  }

  for (const c of commandCases) {
    const actual = parseCommand(c.input);
    const pass = JSON.stringify(actual) === JSON.stringify(c.expected);
    results.push({ suite: 'commands', input: c.input, pass, detail: JSON.stringify(actual) });
  }

  for (const c of stepCases) {
    const actual = splitSteps(c.input);
    const pass = JSON.stringify(actual) === JSON.stringify(c.expected);
    results.push({ suite: `steps (${c.source})`, input: c.input, pass, detail: JSON.stringify(actual) });
  }

  for (const c of classifyCases) {
    const actual = classifyLine(c.input);
    results.push({ suite: 'classify', input: c.input, pass: actual === c.kind, detail: actual });
  }

  for (const c of pasteCases) {
    const r = parsePaste(c.input);
    const e = c.expected as {
      title?: string;
      ingredients: string[];
      steps: number;
      timers?: (number | null)[];
      servings?: number;
      prepMinutes?: number;
      sections?: string[];
      tips?: string;
    };
    const problems: string[] = [];
    if (e.title !== undefined && r.title !== e.title) problems.push(`title ${JSON.stringify(r.title)}`);
    const names = r.ingredients.map((i) => i.name.toLowerCase());
    if (JSON.stringify(names) !== JSON.stringify(e.ingredients.map((n) => n.toLowerCase())))
      problems.push(`ingredients ${JSON.stringify(names)}`);
    if (r.steps.length !== e.steps) problems.push(`steps ${JSON.stringify(r.steps.map((s) => s.text))}`);
    if (e.timers && JSON.stringify(r.steps.map((s) => s.timerSeconds ?? null)) !== JSON.stringify(e.timers)) {
      problems.push(`timers ${JSON.stringify(r.steps.map((s) => s.timerSeconds ?? null))}`);
    }
    if (e.servings !== undefined && r.servings !== e.servings) problems.push(`servings ${r.servings}`);
    if (e.prepMinutes !== undefined && r.prepMinutes !== e.prepMinutes) problems.push(`prep ${r.prepMinutes}`);
    if (e.sections && JSON.stringify(r.ingredients.map((i) => i.section)) !== JSON.stringify(e.sections)) {
      problems.push(`sections ${JSON.stringify(r.ingredients.map((i) => i.section))}`);
    }
    if (e.tips !== undefined && r.tips !== e.tips) problems.push(`tips ${JSON.stringify(r.tips)}`);
    results.push({ suite: 'paste', input: c.name, pass: problems.length === 0, detail: problems.join('; ') });
  }

  for (const c of monologueCases) {
    const r = parseMonologue(c.input);
    const problems: string[] = [];
    const names = r.ingredients.map((i) => i.name.toLowerCase());
    for (const want of c.expected.ingredients) if (!names.some((n) => n.includes(want))) problems.push(`missing ${want}`);
    if (r.steps.length < c.expected.minSteps) problems.push(`only ${r.steps.length} steps`);
    const timers = r.steps.map((s) => s.timerSeconds).filter((t) => t !== undefined);
    if (JSON.stringify(timers) !== JSON.stringify(c.expected.timers)) problems.push(`timers ${JSON.stringify(timers)}`);
    results.push({
      suite: 'just-talk',
      input: c.name,
      pass: problems.length === 0,
      detail: `${problems.join('; ')} | ${JSON.stringify(names)} | ${JSON.stringify(r.steps.map((s) => s.text))}`,
    });
  }

  return results;
}

export function summarise(results: CaseResult[]) {
  const suites = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const s = suites.get(r.suite) ?? { pass: 0, total: 0 };
    s.total++;
    if (r.pass) s.pass++;
    suites.set(r.suite, s);
  }
  const pass = results.filter((r) => r.pass).length;
  return { pass, total: results.length, accuracy: pass / results.length, suites };
}
