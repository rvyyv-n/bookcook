/** A single amount, or a range such as "1–2". */
export type Quantity = number | [number, number];

export interface ParsedIngredient {
  quantity?: Quantity;
  unit?: string;
  name: string;
  note?: string;
}

export interface ParsedStep {
  text: string;
  timerSeconds?: number;
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
