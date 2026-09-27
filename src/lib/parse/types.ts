/** A single amount, or a range such as "1–2". */
export type Quantity = number | [number, number];

/** What made the parser unsure: a word it doesn't know, two amounts in one line, or text it couldn't place. */
export type CheckReason = 'unknownWord' | 'twoAmounts' | 'unclear';

/** A parsed row that needs a second look on Review ("Check this · heard “haldi”"). */
export interface ParseCheck {
  reason: CheckReason;
  /** The words as heard or typed, when they explain the reason. */
  heard?: string;
}

export interface ParsedIngredient {
  quantity?: Quantity;
  unit?: string;
  name: string;
  note?: string;
  check?: ParseCheck;
}

export interface ParsedStep {
  text: string;
  timerSeconds?: number;
  check?: ParseCheck;
}

export interface ParsedRecipe {
  title?: string;
  author?: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients: (ParsedIngredient & { section?: string })[];
  steps: ParsedStep[];
  tips?: string;
  tags?: string[];
  sourceUrl?: string;
  imageUrl?: string;
}
