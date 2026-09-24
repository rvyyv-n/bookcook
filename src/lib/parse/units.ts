export type UnitKind = 'volume' | 'mass' | 'count' | 'vague';
export type UnitSystem = 'metric' | 'imperial' | 'neutral';

export interface UnitDef {
  /** Canonical id stored on ingredients, e.g. "tbsp". */
  id: string;
  singular: string;
  plural: string;
  kind: UnitKind;
  system: UnitSystem;
  /** Millilitres for volume, grams for mass. */
  toBase?: number;
  /** Lower-case aliases (matched case-insensitively unless listed in `caseSensitive`). */
  aliases: string[];
  caseSensitive?: string[];
  /** Vague amounts never scale or convert. */
  vague?: boolean;
  /** Written after the name ("salt to taste"). */
  trailing?: boolean;
}

export const UNIT_DEFS: UnitDef[] = [
  {
    id: 'cup',
    singular: 'cup',
    plural: 'cups',
    kind: 'volume',
    system: 'imperial',
    toBase: 240,
    aliases: ['cup', 'cups', 'c', 'cupful', 'cupfuls', 'mug', 'mugs'],
  },
  {
    id: 'tbsp',
    singular: 'tbsp',
    plural: 'tbsp',
    kind: 'volume',
    system: 'neutral',
    toBase: 15,
    aliases: [
      'tbsp',
      'tbsps',
      'tbs',
      'tbl',
      'tbl.',
      'tbsp.',
      'tablespoon',
      'tablespoons',
      'tablespoonful',
      'tablespoonfuls',
      'big spoon',
      'big spoons',
      'large spoon',
      'large spoons',
      'table spoon',
      'table spoons',
    ],
    caseSensitive: ['T'],
  },
  {
    id: 'tsp',
    singular: 'tsp',
    plural: 'tsp',
    kind: 'volume',
    system: 'neutral',
    toBase: 5,
    aliases: [
      'tsp',
      'tsps',
      'tsp.',
      'teaspoon',
      'teaspoons',
      'teaspoonful',
      'teaspoonfuls',
      'small spoon',
      'small spoons',
      'little spoon',
      'little spoons',
      'tea spoon',
      'tea spoons',
    ],
    caseSensitive: ['t'],
  },
  {
    id: 'ml',
    singular: 'ml',
    plural: 'ml',
    kind: 'volume',
    system: 'metric',
    toBase: 1,
    aliases: ['ml', 'mls', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'mil', 'mils'],
  },
  {
    id: 'l',
    singular: 'l',
    plural: 'l',
    kind: 'volume',
    system: 'metric',
    toBase: 1000,
    aliases: ['l', 'liter', 'liters', 'litre', 'litres', 'ltr', 'ltrs'],
  },
  {
    id: 'fl oz',
    singular: 'fl oz',
    plural: 'fl oz',
    kind: 'volume',
    system: 'imperial',
    toBase: 29.5735,
    aliases: ['fl oz', 'fl. oz.', 'fl. oz', 'fluid ounce', 'fluid ounces'],
  },
  { id: 'pint', singular: 'pint', plural: 'pints', kind: 'volume', system: 'imperial', toBase: 473.176, aliases: ['pint', 'pints', 'pt'] },
  {
    id: 'quart',
    singular: 'quart',
    plural: 'quarts',
    kind: 'volume',
    system: 'imperial',
    toBase: 946.353,
    aliases: ['quart', 'quarts', 'qt'],
  },
  {
    id: 'g',
    singular: 'g',
    plural: 'g',
    kind: 'mass',
    system: 'metric',
    toBase: 1,
    aliases: ['g', 'gm', 'gms', 'gr', 'gram', 'grams', 'gramme', 'grammes', 'g.'],
  },
  {
    id: 'kg',
    singular: 'kg',
    plural: 'kg',
    kind: 'mass',
    system: 'metric',
    toBase: 1000,
    aliases: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes'],
  },
  { id: 'oz', singular: 'oz', plural: 'oz', kind: 'mass', system: 'imperial', toBase: 28.3495, aliases: ['oz', 'oz.', 'ounce', 'ounces'] },
  {
    id: 'lb',
    singular: 'lb',
    plural: 'lb',
    kind: 'mass',
    system: 'imperial',
    toBase: 453.592,
    aliases: ['lb', 'lbs', 'lb.', 'lbs.', 'pound', 'pounds'],
  },
  { id: 'clove', singular: 'clove', plural: 'cloves', kind: 'count', system: 'neutral', aliases: ['clove', 'cloves'] },
  { id: 'can', singular: 'can', plural: 'cans', kind: 'count', system: 'neutral', aliases: ['can', 'cans', 'tin', 'tins'] },
  {
    id: 'packet',
    singular: 'packet',
    plural: 'packets',
    kind: 'count',
    system: 'neutral',
    aliases: ['packet', 'packets', 'pack', 'packs', 'package', 'packages', 'pkt', 'sachet', 'sachets'],
  },
  { id: 'bunch', singular: 'bunch', plural: 'bunches', kind: 'count', system: 'neutral', aliases: ['bunch', 'bunches'] },
  { id: 'slice', singular: 'slice', plural: 'slices', kind: 'count', system: 'neutral', aliases: ['slice', 'slices'] },
  { id: 'piece', singular: 'piece', plural: 'pieces', kind: 'count', system: 'neutral', aliases: ['piece', 'pieces', 'pc', 'pcs'] },
  { id: 'sprig', singular: 'sprig', plural: 'sprigs', kind: 'count', system: 'neutral', aliases: ['sprig', 'sprigs'] },
  { id: 'stick', singular: 'stick', plural: 'sticks', kind: 'count', system: 'neutral', aliases: ['stick', 'sticks'] },
  {
    id: 'inch',
    singular: 'inch',
    plural: 'inches',
    kind: 'count',
    system: 'neutral',
    aliases: ['inch', 'inches', 'inch piece', 'inch pieces', 'in piece'],
  },
  { id: 'head', singular: 'head', plural: 'heads', kind: 'count', system: 'neutral', aliases: ['head', 'heads'] },
  {
    id: 'pinch',
    singular: 'pinch',
    plural: 'pinches',
    kind: 'vague',
    system: 'neutral',
    vague: true,
    aliases: ['pinch', 'pinches', 'pinch of', 'small pinch', 'big pinch'],
  },
  { id: 'dash', singular: 'dash', plural: 'dashes', kind: 'vague', system: 'neutral', vague: true, aliases: ['dash', 'dashes'] },
  {
    id: 'handful',
    singular: 'handful',
    plural: 'handfuls',
    kind: 'vague',
    system: 'neutral',
    vague: true,
    aliases: ['handful', 'handfuls', 'small handful', 'large handful', 'big handful', 'fistful', 'fistfuls'],
  },
  { id: 'splash', singular: 'splash', plural: 'splashes', kind: 'vague', system: 'neutral', vague: true, aliases: ['splash', 'splashes'] },
  { id: 'drop', singular: 'drop', plural: 'drops', kind: 'vague', system: 'neutral', vague: true, aliases: ['drop', 'drops'] },
  { id: 'drizzle', singular: 'drizzle', plural: 'drizzles', kind: 'vague', system: 'neutral', vague: true, aliases: ['drizzle'] },
  {
    id: 'to taste',
    singular: 'to taste',
    plural: 'to taste',
    kind: 'vague',
    system: 'neutral',
    vague: true,
    trailing: true,
    aliases: ['to taste', 'as needed', 'as required', 'as per taste', 'according to taste'],
  },
];

const BY_ID = new Map(UNIT_DEFS.map((u) => [u.id, u]));

export function getUnit(id: string | undefined): UnitDef | undefined {
  return id === undefined ? undefined : BY_ID.get(id);
}

export function isVagueUnit(id: string | undefined): boolean {
  return getUnit(id)?.vague === true;
}

interface AliasEntry {
  alias: string;
  unit: UnitDef;
  caseSensitive: boolean;
}

const ALIASES: AliasEntry[] = UNIT_DEFS.flatMap((unit) => [
  ...unit.aliases.map((alias) => ({ alias, unit, caseSensitive: false })),
  ...(unit.caseSensitive ?? []).map((alias) => ({ alias, unit, caseSensitive: true })),
]).sort((a, b) => b.alias.length - a.alias.length);

export interface UnitMatch {
  unit: UnitDef;
  /** Characters consumed including leading whitespace and a following "of". */
  length: number;
}

/**
 * Read a unit at the start of `input` (after optional whitespace), longest alias first.
 * Consumes a trailing "of" ("a cup of rice").
 */
export function readUnit(input: string): UnitMatch | null {
  const lead = /^\s*/.exec(input)![0].length;
  const rest = input.slice(lead);
  const lower = rest.toLowerCase();
  for (const entry of ALIASES) {
    const hay = entry.caseSensitive ? rest : lower;
    if (!hay.startsWith(entry.alias)) continue;
    const after = rest.slice(entry.alias.length);
    // Must end on a word boundary; single letters need a following space or digit-free boundary.
    if (/^[a-z]/i.test(after)) continue;
    if (entry.alias.length === 1 && /^[.\-']/.test(after)) continue;
    // Bare single-letter units ("c", "l", "t") need something after them ("2 c flour").
    if (entry.alias.length === 1 && !/^\s+\S/.test(after)) continue;
    let length = lead + entry.alias.length;
    const of = /^\s+of\b/i.exec(after);
    if (of) length += of[0].length;
    return { unit: entry.unit, length };
  }
  return null;
}

/** Display name for a unit and amount ("cup" / "cups"). */
export function unitLabel(id: string | undefined, amount?: number): string {
  if (!id) return '';
  const unit = getUnit(id);
  if (!unit) return id;
  return amount !== undefined && amount > 1 ? unit.plural : unit.singular;
}

/** Common unit spellings offered by autocomplete after a number. */
export const SUGGESTED_UNITS = ['cup', 'tbsp', 'tsp', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'clove', 'pinch', 'handful', 'can', 'bunch'];
