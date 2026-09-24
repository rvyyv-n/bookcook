import { addCollection, listCollections } from '../../db/collections';
import { saveRecipe } from '../../db/recipes';
import type { Recipe } from '../../db/types';
import { parseIngredient } from '../../lib/parse/ingredient';
import { stepTimer } from '../../lib/parse/timers';

type Example = Omit<Partial<Recipe>, 'ingredients' | 'steps'> & {
  title: string;
  ingredients: (string | { section: string })[];
  steps: string[];
  collections?: string[];
};

const EXAMPLES: Example[] = [
  {
    title: "Mom's Chicken Biryani",
    author: 'Mom',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 75,
    tags: ['Rice', 'Eid'],
    collections: ["Mom's classics", 'Eid'],
    source: 'voice',
    ingredients: [
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
    ],
    steps: [
      'Mix the chicken with the yogurt and all the spices and leave it for at least 30 minutes.',
      'Boil the rice with the cardamom and bay leaf until it’s about three-quarters done, around 7 minutes, then drain.',
      'Cook the chicken on medium heat until the oil comes to the top, about 25 minutes.',
      'Layer the rice over the chicken, then scatter the onions, mint, coriander and saffron milk.',
      'Cover tightly and keep on the lowest heat for 20 minutes until the steam comes out.',
    ],
    tips: 'Don’t stir after layering. Just trust it.',
    story: [{ prompt: 'Who taught you this?', answer: 'My mother, every Eid. I learned by watching her hands, not measuring.' }],
    transcript:
      'okay so first you take the chicken, about a kilo, and put the yogurt, maybe a cup, and then the masala, you know, the red chilli, haldi, a little salt… and leave it, at least half an hour. then the rice, you boil it with the elaichi and one tej patta, not fully, three-quarter, and drain it…',
  },
  {
    title: 'Sunday Lentil Soup',
    author: 'Dad',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    tags: ['Soup', 'Quick'],
    collections: ['Quick weeknights'],
    source: 'typed',
    cookedCount: 8,
    ingredients: [
      '1 cup red lentils, rinsed',
      '1 onion, chopped',
      '2 carrots, diced',
      '2 cloves garlic, sliced',
      '1 tsp cumin seeds',
      '1 litre vegetable stock',
      '2 tbsp olive oil',
      'juice of 1 lemon',
      'a handful of parsley',
    ],
    steps: [
      'Warm the olive oil and fry the cumin seeds for 30 seconds.',
      'Add the onion, carrots and garlic and soften for 5 minutes.',
      'Add the lentils and stock and simmer for 25 minutes, until the lentils fall apart.',
      'Blend until smooth, then finish with the lemon and parsley.',
    ],
    tips: 'Freezes well. Add a splash of water when you reheat it.',
  },
  {
    title: "Grandma's Banana Bread",
    author: 'Nani',
    servings: 8,
    prepMinutes: 15,
    cookMinutes: 55,
    tags: ['Baking'],
    collections: ["Mom's classics"],
    source: 'pasted',
    cookedCount: 15,
    ingredients: [
      '3 ripe bananas, mashed',
      '75 g butter, melted',
      '150 g sugar',
      '1 egg, beaten',
      '1 tsp vanilla extract',
      '1 tsp baking soda',
      'a pinch of salt',
      '190 g plain flour',
    ],
    steps: [
      'Heat the oven to 175°C and butter a loaf tin.',
      'Mix the melted butter into the mashed bananas.',
      'Stir in the sugar, egg and vanilla, then the baking soda and salt.',
      'Fold in the flour until just combined.',
      'Bake for 55 minutes, until a skewer comes out clean. Cool for 10 minutes before slicing.',
    ],
    story: [{ prompt: 'When do you make it?', answer: 'Whenever the bananas go spotty. Nothing gets thrown away in Nani’s kitchen.' }],
  },
];

/** Add the example recipes (and their collections) to the cookbook. */
export async function addExampleRecipes(): Promise<void> {
  const existing = await listCollections();
  const collectionIds = new Map(existing.map((c) => [c.name, c.id]));
  for (const name of new Set(EXAMPLES.flatMap((e) => e.collections ?? []))) {
    if (!collectionIds.has(name)) collectionIds.set(name, (await addCollection(name)).id);
  }
  const now = Date.now();
  for (const [i, ex] of EXAMPLES.entries()) {
    const { collections, ingredients, steps, ...rest } = ex;
    let section: string | undefined;
    const ings: Recipe['ingredients'] = [];
    for (const line of ingredients) {
      if (typeof line !== 'string') {
        section = line.section;
        continue;
      }
      ings.push({ id: crypto.randomUUID(), ...parseIngredient(line), ...(section ? { section } : {}) });
    }
    await saveRecipe({
      ...rest,
      lang: 'en',
      createdAt: now - (EXAMPLES.length - i) * 86_400_000,
      lastCookedAt: rest.cookedCount ? now - (i + 2) * 86_400_000 : undefined,
      collectionIds: (collections ?? []).map((c) => collectionIds.get(c)!),
      ingredients: ings,
      steps: steps.map((text) => ({ id: crypto.randomUUID(), text, timerSeconds: stepTimer(text) })),
    });
  }
}
