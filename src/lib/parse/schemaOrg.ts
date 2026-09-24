import { parseIngredient, sectionHeading } from './ingredient';
import { findNumber } from './numbers';
import { cleanStep } from './steps';
import { isoDurationToMinutes, stepTimer } from './timers';
import type { ParsedRecipe, ParsedStep } from './types';

type Json = unknown;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  eacute: 'é',
};

/** Strip tags and decode entities without a DOM (runs in the Pages Function too). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|div|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z\d]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function isObj(v: Json): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasType(node: Record<string, Json>, type: string): boolean {
  const t = node['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
}

/** Find the first schema.org Recipe node in any JSON-LD shape (array, @graph, nested). */
export function findRecipeNode(data: Json, depth = 0): Record<string, Json> | undefined {
  if (depth > 6) return undefined;
  if (Array.isArray(data)) {
    for (const d of data) {
      const r = findRecipeNode(d, depth + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (!isObj(data)) return undefined;
  if (hasType(data, 'Recipe')) return data;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    if (key in data) {
      const r = findRecipeNode(data[key], depth + 1);
      if (r) return r;
    }
  }
  return undefined;
}

/** All JSON-LD blocks in an HTML page. */
export function extractJsonLd(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const body = m[1]!.trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    try {
      out.push(JSON.parse(body));
    } catch {
      // Some sites put control characters in JSON-LD; try once more without them.
      try {
        out.push(JSON.parse(body.replace(/[\u0000-\u001f]+/g, ' ')));
      } catch {
        /* ignore broken blocks */
      }
    }
  }
  return out;
}

function text(v: Json): string | undefined {
  if (typeof v === 'string') return htmlToText(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (isObj(v)) return text(v.name ?? v.text ?? v['@value']);
  return undefined;
}

function strings(v: Json): string[] {
  if (v === undefined || v === null) return [];
  if (typeof v === 'string') return v.split(/\s*,\s*/).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(strings);
  const t = text(v);
  return t ? [t] : [];
}

function author(v: Json): string | undefined {
  if (Array.isArray(v)) return author(v[0]);
  if (typeof v === 'string') return htmlToText(v);
  if (isObj(v)) return text(v.name);
  return undefined;
}

function image(v: Json): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return image(v[0]);
  if (isObj(v)) return typeof v.url === 'string' ? v.url : typeof v['@id'] === 'string' ? (v['@id'] as string) : undefined;
  return undefined;
}

function instructions(v: Json, out: ParsedStep[], section?: string): void {
  if (v === undefined || v === null) return;
  if (typeof v === 'string') {
    const t = htmlToText(v);
    for (const line of t.split(/\n+/)) {
      const s = cleanStep(line);
      if (s) out.push(withTimer(s));
    }
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x) => instructions(x, out, section));
    return;
  }
  if (!isObj(v)) return;
  if (hasType(v, 'HowToSection')) {
    instructions(v.itemListElement, out, text(v.name));
    return;
  }
  if (v.itemListElement) {
    instructions(v.itemListElement, out, section);
    return;
  }
  const t = text(v.text ?? v.name ?? v.description);
  if (t) {
    const s = cleanStep(t);
    if (s) out.push(withTimer(s));
  }
}

function withTimer(text: string): ParsedStep {
  const timerSeconds = stepTimer(text);
  return timerSeconds ? { text, timerSeconds } : { text };
}

function servings(v: Json): number | undefined {
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const n = servings(x);
      if (n) return n;
    }
    return undefined;
  }
  if (typeof v === 'string') {
    const n = findNumber(v);
    return n ? Math.round(n) : undefined;
  }
  return undefined;
}

/** schema.org Recipe (JSON-LD) → recipe fields ready for a Draft. */
export function recipeFromSchema(data: Json, sourceUrl?: string): ParsedRecipe | undefined {
  const node = findRecipeNode(data);
  if (!node) return undefined;
  const steps: ParsedStep[] = [];
  instructions(node.recipeInstructions, steps);

  let section: string | undefined;
  const ingredients: ParsedRecipe['ingredients'] = [];
  for (const raw of strings(node.recipeIngredient ?? node.ingredients).length ? toLines(node.recipeIngredient ?? node.ingredients) : []) {
    const heading = sectionHeading(raw);
    if (heading) {
      section = heading;
      continue;
    }
    const ing = parseIngredient(raw);
    if (ing.name) ingredients.push(section ? { ...ing, section } : ing);
  }

  const prep = isoDurationToMinutes(text(node.prepTime));
  const cook = isoDurationToMinutes(text(node.cookTime));
  const total = isoDurationToMinutes(text(node.totalTime));
  const recipe: ParsedRecipe = {
    title: text(node.name),
    author: author(node.author),
    description: text(node.description),
    servings: servings(node.recipeYield ?? node.yield),
    prepMinutes: prep,
    cookMinutes: cook ?? (total && prep ? Math.max(0, total - prep) || undefined : total),
    ingredients,
    steps,
    tags: [
      ...new Set(
        [...strings(node.recipeCategory), ...strings(node.recipeCuisine), ...strings(node.keywords)]
          .map((t) => t.trim())
          .filter((t) => t && t.length < 30),
      ),
    ].slice(0, 8),
    sourceUrl,
    imageUrl: image(node.image),
  };
  for (const k of Object.keys(recipe) as (keyof ParsedRecipe)[]) if (recipe[k] === undefined) delete recipe[k];
  return recipe;
}

function toLines(v: Json): string[] {
  if (typeof v === 'string') return htmlToText(v).split(/\n+/);
  if (Array.isArray(v)) return v.flatMap((x) => (typeof x === 'string' ? [htmlToText(x)] : text(x) ? [text(x)!] : []));
  return [];
}

/** Find a Recipe in a whole HTML page. */
export function recipeFromHtml(html: string, sourceUrl?: string): ParsedRecipe | undefined {
  for (const block of extractJsonLd(html)) {
    const r = recipeFromSchema(block, sourceUrl);
    if (r && (r.ingredients.length || r.steps.length)) return r;
  }
  return undefined;
}
