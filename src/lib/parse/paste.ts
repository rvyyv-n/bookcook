import { checkIngredient } from './check';
import { classifyLine } from './classify';
import { parseIngredient, sectionHeading, stripListMarker } from './ingredient';
import { findNumber, readQuantity } from './numbers';
import { cleanStep, splitSentences } from './steps';
import { isoDurationToMinutes, stepTimer } from './timers';
import type { ParsedIngredient, ParsedRecipe, ParsedStep } from './types';

type Section = 'none' | 'ingredients' | 'steps' | 'tips' | 'story';

const HEADINGS: [Section, RegExp][] = [
  ['ingredients', /^(?:ingredients?|ingredient list|what you(?:'ll)? need|you(?:'ll| will)? need|shopping list|items?)$/i],
  [
    'steps',
    /^(?:method|methods|directions?|instructions?|steps?|preparation|how to make(?: it)?|how to cook(?: it)?|procedure|recipe|making it|to make)$/i,
  ],
  ['tips', /^(?:tips?|notes?|chef'?s notes?|cook'?s notes?|secrets?|tips and tricks|hints?)$/i],
  ['story', /^(?:story|about|background|the story|history)$/i],
];

function headingOf(line: string): { section: Section; rest: string } | null {
  const s = stripListMarker(line)
    .replace(/^#+\s*/, '')
    .trim();
  // "Ingredients:" or "Ingredients: 2 onions, ..." or "INGREDIENTS"
  const m = /^([^:]{2,40}?)\s*:?\s*(?::\s*(.*))?$/.exec(s);
  if (!m) return null;
  if (/\d/.test(m[1]!)) return null;
  const word = m[1]!
    .replace(/\s*\(.*\)$/, '')
    .replace(/[^\p{L}' ]/gu, '')
    .trim();
  const rest = (m[2] ?? '').trim();
  // "Preparation: 20 min" is a time, not a heading.
  if (rest && rest.length < 20 && minutesIn(rest)) return null;
  for (const [section, re] of HEADINGS) {
    if (re.test(word)) return { section, rest };
  }
  const colon = /^([^:]{2,40}?)\s*:\s*(.+)$/.exec(s);
  if (colon && !/\d/.test(colon[1]!) && !(colon[2]!.length < 20 && minutesIn(colon[2]!))) {
    const w = colon[1]!.replace(/[^\p{L}' ]/gu, '').trim();
    for (const [section, re] of HEADINGS) {
      if (re.test(w)) return { section, rest: colon[2]!.trim() };
    }
  }
  return null;
}

interface Meta {
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
}

function minutesIn(text: string): number | undefined {
  const iso = isoDurationToMinutes(text.trim());
  if (iso) return iso;
  const secs = stepTimer(text);
  return secs ? Math.round(secs / 60) : undefined;
}

/** "Serves 4", "Prep: 20 min", "Cook time 1 hr" → metadata. */
function readMeta(line: string, meta: Meta): boolean {
  const s = stripListMarker(line).trim();
  let m = /^(?:serves|servings?|yield|yields|makes|portions?|for)\s*:?\s*(.+?)(?:\s*(?:people|persons|servings|portions))?\.?$/i.exec(s);
  if (m && s.length < 40) {
    const n = findNumber(m[1]!);
    if (n) {
      meta.servings = Math.round(n);
      return true;
    }
  }
  m = /^prep(?:aration)?(?:\s+time\s*:?|\s*:)\s*(.+)$/i.exec(s);
  if (m && s.length < 40) {
    const n = minutesIn(m[1]!);
    if (n) {
      meta.prepMinutes = n;
      return true;
    }
  }
  m = /^(?:cook(?:ing)?|bak(?:e|ing)|total)(?:\s+time\s*:?|\s*:)\s*(.+)$/i.exec(s);
  if (m && s.length < 40) {
    const n = minutesIn(m[1]!);
    if (n) {
      meta.cookMinutes = n;
      return true;
    }
  }
  return false;
}

const NUMBERED = /^\s*(?:step\s*)?\(?(\d{1,2})[.):-]\s*\S|^\s*step\s*\d{1,2}\b/i;
const BULLET = /^\s*(?:[-*–—](?=\s)|[•·▪◦‣⁃▫■●➤→]|\[\s?[xX]?\s?\]|☐|✓|✔|✅|🔸|🔹|👉)/u;

function splitMultiIngredient(line: string): string[] {
  const parts = line.split(/\s*[,;]\s*/);
  if (parts.length >= 2 && parts.every((p) => readQuantity(p) !== null && /\d|^(?:a|an|one|two|three|four|five|half)\b/i.test(p.trim()))) {
    return parts;
  }
  return [line];
}

function pushStep(steps: ParsedStep[], text: string) {
  const clean = cleanStep(text);
  if (!clean) return;
  const timerSeconds = stepTimer(clean);
  steps.push(timerSeconds ? { text: clean, timerSeconds } : { text: clean });
}

/**
 * Smart paste: split text from WhatsApp, Notes, email or websites into title,
 * ingredients and steps. Headings, bullets and numbering first, then line classification.
 */
/** An ingredient line, flagged for Review when the parser is unsure of it. */
function withCheck(line: string): ParsedIngredient {
  const ing = parseIngredient(line);
  const check = checkIngredient(line, ing);
  return check ? { ...ing, check } : ing;
}

export function parsePaste(text: string): ParsedRecipe {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''));

  const recipe: ParsedRecipe = { ingredients: [], steps: [] };
  const meta: Meta = {};
  const tips: string[] = [];
  const story: string[] = [];
  let section: Section = 'none';
  let ingSection: string | undefined;
  let sawHeading = false;
  /** Steps collected per numbered item so continuation lines join the right step. */
  let stepBuffer: string[] = [];
  let numbered = false;

  const flushStep = () => {
    if (stepBuffer.length) {
      const joined = stepBuffer.join(' ');
      if (numbered) pushStep(recipe.steps, joined);
      else for (const s of splitSentences(joined)) pushStep(recipe.steps, s);
    }
    stepBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (!line) {
      if (section === 'steps') flushStep();
      continue;
    }

    const heading = headingOf(line);
    if (heading) {
      flushStep();
      section = heading.section;
      sawHeading = true;
      ingSection = undefined;
      numbered = false;
      if (heading.rest) {
        if (section === 'ingredients') heading.rest.split(/\s*[,;]\s*/).forEach((p) => p && recipe.ingredients.push(withCheck(p)));
        else if (section === 'steps') stepBuffer.push(heading.rest);
        else if (section === 'tips') tips.push(heading.rest);
        else if (section === 'story') story.push(heading.rest);
      }
      continue;
    }
    if (readMeta(line, meta)) continue;

    // Title: the first short line before anything else.
    if (!recipe.title && recipe.ingredients.length === 0 && recipe.steps.length === 0 && section === 'none' && stepBuffer.length === 0) {
      const clean = stripListMarker(line)
        .replace(/^#+\s*/, '')
        .replace(/[\p{Extended_Pictographic}️‍\s]+$/u, '')
        .replace(/[:.]$/, '')
        .trim();
      const kind = classifyLine(clean);
      if (
        clean.length <= 70 &&
        !BULLET.test(raw) &&
        !NUMBERED.test(raw) &&
        (kind === 'step' ? clean.split(/\s+/).length <= 6 && !/[.!?]$/.test(line) : readQuantity(clean) === null)
      ) {
        recipe.title = clean.replace(/\s*recipe$/i, (m) => (clean.length > 8 ? '' : m)).trim();
        continue;
      }
    }

    const sub = sectionHeading(line);
    if (sub && section !== 'steps' && section !== 'tips' && section !== 'story') {
      section = 'ingredients';
      ingSection = sub;
      continue;
    }

    let target: Section = section;
    if (section === 'none') {
      target = NUMBERED.test(raw) ? 'steps' : classifyLine(line) === 'ingredient' ? 'ingredients' : 'steps';
    }

    if (target === 'ingredients') {
      // Ingredient sections sometimes run straight into unlabelled numbered steps.
      if (section === 'ingredients' && NUMBERED.test(raw) && classifyLine(line) === 'step') {
        section = 'steps';
        numbered = true;
        stepBuffer.push(stripListMarker(line));
        continue;
      }
      for (const part of splitMultiIngredient(stripListMarker(line))) {
        const ing = withCheck(part);
        if (!ing.name) continue;
        recipe.ingredients.push(ingSection ? { ...ing, section: ingSection } : ing);
      }
    } else if (target === 'steps') {
      if (NUMBERED.test(raw) || BULLET.test(raw)) {
        flushStep();
        numbered = true;
        stepBuffer.push(stripListMarker(line));
      } else if (numbered && stepBuffer.length) {
        stepBuffer.push(line);
      } else {
        stepBuffer.push(line);
        if (!sawHeading || section === 'none') flushStep();
      }
      if (section === 'none') flushStep();
    } else if (target === 'tips') {
      tips.push(stripListMarker(line));
    } else if (target === 'story') {
      story.push(line);
    }
  }
  flushStep();

  if (tips.length) recipe.tips = tips.join('\n');
  if (story.length) recipe.description = story.join('\n');
  Object.assign(recipe, meta);
  return recipe;
}
