import { newId } from '../../db/db';
import type { Ingredient, Recipe, Step } from '../../db/types';
import { formatIngredient, parseIngredient, sectionHeading } from '../../lib/parse/ingredient';
import { quantityMax } from '../../lib/parse/numbers';
import type { ParsedRecipe } from '../../lib/parse/types';
import { getUnit, SUGGESTED_UNITS, unitLabel } from '../../lib/parse/units';

/** One line in the ingredient editor, exactly as typed. A line ending in ":" is a section heading. */
export interface IngredientLine {
  id: string;
  text: string;
}

export function isHeadingLine(text: string): boolean {
  return sectionHeading(text) !== undefined;
}

/** Typed lines → structured ingredients (headings become sections). */
export function linesToIngredients(lines: IngredientLine[]): Ingredient[] {
  const out: Ingredient[] = [];
  let section: string | undefined;
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const heading = sectionHeading(text);
    if (heading !== undefined) {
      section = heading;
      continue;
    }
    const parsed = parseIngredient(text);
    if (!parsed.name) continue;
    out.push({ id: line.id, ...parsed, ...(section ? { section } : {}) });
  }
  return out;
}

/** Structured ingredients → editable lines (inserting a heading line where the section changes). */
export function ingredientsToLines(ings: Ingredient[] | undefined): IngredientLine[] {
  const lines: IngredientLine[] = [];
  let section: string | undefined;
  for (const i of ings ?? []) {
    if (i.section !== section) {
      section = i.section;
      if (section) lines.push({ id: newId(), text: `${section}:` });
    }
    lines.push({ id: i.id, text: formatIngredient(i) });
  }
  return lines;
}

export function newStep(text = ''): Step {
  return { id: newId(), text };
}

/** Parsed recipe (paste, web, voice) → draft fields. */
export function draftFromParsed(p: ParsedRecipe): Partial<Recipe> {
  const recipe: Partial<Recipe> = {
    ingredients: p.ingredients.map((i) => ({ id: newId(), ...i })),
    steps: p.steps.map((s) => ({ id: newId(), ...s })),
  };
  if (p.title) recipe.title = p.title;
  if (p.author) recipe.author = p.author;
  if (p.description) recipe.description = p.description;
  if (p.servings) recipe.servings = p.servings;
  if (p.prepMinutes) recipe.prepMinutes = p.prepMinutes;
  if (p.cookMinutes) recipe.cookMinutes = p.cookMinutes;
  if (p.tips) recipe.tips = p.tips;
  if (p.tags?.length) recipe.tags = p.tags;
  if (p.sourceUrl) recipe.sourceUrl = p.sourceUrl;
  return recipe;
}

// Autocomplete

export interface Suggestion {
  /** What the line becomes if this suggestion is chosen. */
  text: string;
  label: string;
  kind: 'unit' | 'ingredient';
}

/**
 * Suggestions for the end of an ingredient line: units right after a number,
 * ingredient names while typing the name. Never changes the line on its own.
 */
export function suggestForLine(text: string, knownNames: string[], limit = 5): Suggestion[] {
  if (!text.trim() || isHeadingLine(text)) return [];
  const parsed = parseIngredient(text);
  const trimmedEnd = text.replace(/\s+$/, '');

  // "2 " or "2 c" → units.
  const afterNumber = /^(.*?\d(?:[\d\s./½¼¾⅓⅔]*\d)?[½¼¾⅓⅔]?)\s+([a-z]*)$/i.exec(text);
  if (afterNumber && !parsed.unit && parsed.name.toLowerCase() === afterNumber[2]!.toLowerCase()) {
    const typed = afterNumber[2]!.toLowerCase();
    const amount = parsed.quantity === undefined ? 1 : quantityMax(parsed.quantity);
    return SUGGESTED_UNITS.map((u) => unitLabel(u, amount))
      .filter((label) => label.toLowerCase().startsWith(typed) && label.toLowerCase() !== typed)
      .slice(0, limit)
      .map((label) => ({ text: `${afterNumber[1]} ${label} `, label, kind: 'unit' as const }));
  }

  if (parsed.note || !parsed.name || parsed.name.length < 2) return [];
  if (getUnit(parsed.unit)?.trailing) return [];
  const name = parsed.name.toLowerCase();
  const at = trimmedEnd.toLowerCase().lastIndexOf(name);
  if (at < 0 || at + name.length !== trimmedEnd.length) return [];
  const head = trimmedEnd.slice(0, at);
  const seen = new Set<string>();
  const starts: string[] = [];
  const contains: string[] = [];
  for (const n of knownNames) {
    const k = n.toLowerCase();
    if (k === name || seen.has(k)) continue;
    seen.add(k);
    if (k.startsWith(name)) starts.push(n);
    else if (k.includes(` ${name}`)) contains.push(n);
  }
  return [...starts.sort((a, b) => a.length - b.length), ...contains]
    .slice(0, limit)
    .map((n) => ({ text: `${head}${n}`, label: n, kind: 'ingredient' as const }));
}
