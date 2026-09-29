/**
 * Mom's Chicken Biryani, the example recipe every screenshot of the app uses, read by the app's own
 * parser (src/lib/parse) exactly as the app reads it (src/features/library/examples.ts).
 */
import { parseIngredient } from '../../src/lib/parse/ingredient';
import type { ParsedIngredient } from '../../src/lib/parse/types';

export const title = "Mom's Chicken Biryani";
export const author = 'Mom';
export const servings = 6;
export const story = 'My mother, every Sunday. I learned by watching her hands, not measuring.';
export const tip = 'Don’t stir after layering. Just trust it.';

const lines: (string | { section: string })[] = [
  { section: 'For the marinade' },
  '1 kg chicken, bone-in',
  '1 cup yogurt',
  '1 tbsp ginger garlic paste',
  '2 tsp red chilli powder',
  '1 tsp turmeric',
  'salt to taste',
  { section: 'For the rice' },
  '3 cups basmati rice, washed and soaked',
  '4 green cardamom',
  '1 bay leaf',
  { section: 'To finish' },
  '2 onions, thinly sliced and fried',
  'a handful of mint leaves',
  'a handful of coriander',
  'a pinch of saffron in 2 tbsp warm milk',
];

export interface Section {
  name: string;
  items: (ParsedIngredient & { id: string })[];
}

export const sections: Section[] = [];
let n = 0;
for (const line of lines) {
  if (typeof line !== 'string') sections.push({ name: line.section, items: [] });
  else sections.at(-1)!.items.push({ ...parseIngredient(line), id: `i${n++}` });
}

export const ingredients = sections.flatMap((s) => s.items);

export const steps = [
  'Mix the chicken with the yogurt and all the spices and leave it for at least 30 minutes.',
  'Boil the rice with the cardamom and bay leaf until it’s about three-quarters done, around 7 minutes, then drain.',
  'Cook the chicken on medium heat until the oil comes to the top, about 25 minutes.',
  'Layer the rice over the chicken, then scatter the onions, mint, coriander and saffron milk.',
  'Cover tightly and keep on the lowest heat for 20 minutes until the steam comes out.',
];
