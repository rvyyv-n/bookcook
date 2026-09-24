import { describe, expect, it } from 'vitest';
import schemaFixture from './__fixtures__/schema-recipe.json';
import { runFixtures, summarise } from './__fixtures__/score';
import {
  convertIngredient,
  findMentions,
  formatDuration,
  formatIngredient,
  formatQuantity,
  ingredientParts,
  isoDurationToMinutes,
  mergeIntoList,
  parseIngredient,
  parseNumber,
  readQuantity,
  recipeFromHtml,
  recipeFromSchema,
  roundNice,
  scaleIngredient,
  sectionHeading,
  segmentMentions,
  splitOnSeparator,
  aisleFor,
  formatClock,
  extractInlineIngredients,
  type MergeableItem,
} from '.';

describe('fixture corpus', () => {
  it('scores at least 90% overall', () => {
    const results = runFixtures();
    const { accuracy } = summarise(results);
    const failures = results.filter((r) => !r.pass).map((r) => `[${r.suite}] ${r.input} → ${r.detail}`);
    expect(accuracy, failures.join('\n')).toBeGreaterThanOrEqual(0.9);
  });
});

describe('numbers', () => {
  it.each([
    ['2', 2],
    ['1 1/2', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['two and a half', 2.5],
    ['a quarter', 0.25],
    ['half a', 0.5],
    ['a couple of', 2],
    ['twenty five', 25],
    ['one hundred', 100],
    ['a dozen', 12],
  ])('reads %s', (input, expected) => {
    expect(readQuantity(input)?.quantity).toBeCloseTo(expected);
  });

  it('reads ranges', () => {
    expect(readQuantity('one to two')?.quantity).toEqual([1, 2]);
    expect(readQuantity('1-2')?.quantity).toEqual([1, 2]);
    expect(readQuantity('2 or 3')?.quantity).toEqual([2, 3]);
  });

  it('does not read words that merely start like numbers', () => {
    expect(readQuantity('onion')).toBeNull();
    expect(readQuantity('tender')).toBeNull();
  });

  it('parses whole phrases', () => {
    expect(parseNumber('six')).toBe(6);
    expect(parseNumber('six people')).toBeUndefined();
  });

  it('formats with kitchen fractions', () => {
    expect(formatQuantity(1.5)).toBe('1½');
    expect(formatQuantity(0.333)).toBe('⅓');
    expect(formatQuantity([1, 2])).toBe('1–2');
    expect(formatQuantity(2)).toBe('2');
  });

  it('rounds to nice values', () => {
    expect(roundNice(1.52)).toBe(1.5);
    expect(roundNice(0.3)).toBeCloseTo(1 / 3);
    expect(roundNice(0.05)).toBe(0.125);
    expect(roundNice(23.4)).toBe(23);
  });
});

describe('ingredient display', () => {
  it('shows the parse preview parts', () => {
    expect(ingredientParts(parseIngredient('2 cups basmati rice, washed'))).toEqual({
      quantity: '2',
      unit: 'cups',
      name: 'basmati rice',
      note: 'washed',
    });
  });

  it('formats vague and trailing units naturally', () => {
    expect(formatIngredient(parseIngredient('a handful of mint'))).toBe('a handful of mint');
    expect(formatIngredient(parseIngredient('salt to taste'))).toBe('salt to taste');
    expect(formatIngredient(parseIngredient('1 1/2 cups sugar'))).toBe('1½ cups sugar');
  });

  it('detects section headings', () => {
    expect(sectionHeading('For the sauce:')).toBe('For the sauce');
    expect(sectionHeading('2 cups rice')).toBeUndefined();
  });
});

describe('scale', () => {
  it('scales with nice fractions', () => {
    expect(scaleIngredient(parseIngredient('1 cup rice'), 1.5).quantity).toBe(1.5);
    expect(scaleIngredient(parseIngredient('1 cup rice'), 1 / 3).quantity).toBeCloseTo(1 / 3);
    expect(scaleIngredient(parseIngredient('3 onions'), 2).quantity).toBe(6);
  });

  it('rounds metric amounts sensibly', () => {
    expect(scaleIngredient(parseIngredient('250 g flour'), 1.5).quantity).toBe(380);
  });

  it('leaves vague amounts alone', () => {
    expect(scaleIngredient(parseIngredient('a pinch of salt'), 3).quantity).toBe(1);
    expect(scaleIngredient(parseIngredient('salt to taste'), 3).quantity).toBeUndefined();
  });

  it('scales ranges', () => {
    expect(scaleIngredient(parseIngredient('1-2 tbsp oil'), 2).quantity).toEqual([2, 4]);
  });
});

describe('convert', () => {
  it('converts imperial to metric', () => {
    expect(convertIngredient(parseIngredient('1 lb beef'), 'metric')).toMatchObject({ quantity: 450, unit: 'g' });
    expect(convertIngredient(parseIngredient('2 cups milk'), 'metric')).toMatchObject({ quantity: 480, unit: 'ml' });
  });

  it('converts metric to imperial', () => {
    expect(convertIngredient(parseIngredient('1 kg chicken'), 'imperial')).toMatchObject({ quantity: 2.25, unit: 'lb' });
    expect(convertIngredient(parseIngredient('100 g butter'), 'imperial')).toMatchObject({ quantity: 3.5, unit: 'oz' });
    expect(convertIngredient(parseIngredient('250 ml water'), 'imperial')).toMatchObject({ quantity: 1, unit: 'cup' });
  });

  it('leaves spoons, counts and vague units untouched', () => {
    const tsp = parseIngredient('1 tsp salt');
    expect(convertIngredient(tsp, 'imperial')).toBe(tsp);
    const onions = parseIngredient('2 onions');
    expect(convertIngredient(onions, 'metric')).toBe(onions);
    const pinch = parseIngredient('a pinch of saffron');
    expect(convertIngredient(pinch, 'metric')).toBe(pinch);
  });
});

describe('merge and aisles', () => {
  const create = (i: MergeableItem) => ({ ...i, checked: false });

  it('adds counts of the same ingredient', () => {
    const list = mergeIntoList([], [parseIngredient('2 onions')], 'a', create);
    const merged = mergeIntoList(list, [parseIngredient('1 onion')], 'b', create);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ name: 'onions', quantity: 3, fromRecipeIds: ['a', 'b'] });
  });

  it('combines compatible units', () => {
    const list = mergeIntoList([], [parseIngredient('500 g chicken')], 'a', create);
    const merged = mergeIntoList(list, [parseIngredient('1 kg chicken')], 'b', create);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ quantity: 1.5, unit: 'kg' });
  });

  it('keeps incompatible units apart and vague ones once', () => {
    const list = mergeIntoList([], [parseIngredient('2 cups flour'), parseIngredient('salt to taste')], 'a', create);
    const merged = mergeIntoList(list, [parseIngredient('200 g flour'), parseIngredient('a pinch of salt')], 'b', create);
    expect(merged.filter((i) => i.name === 'flour')).toHaveLength(2);
    expect(merged.filter((i) => i.name === 'salt')).toHaveLength(1);
  });

  it('groups by aisle', () => {
    expect(aisleFor('red onions')).toBe('Produce');
    expect(aisleFor('chicken thighs')).toBe('Meat & fish');
    expect(aisleFor('red chilli powder')).toBe('Spices & seasonings');
    expect(aisleFor('Greek yogurt')).toBe('Dairy & eggs');
    expect(aisleFor('unobtainium')).toBe('Other');
  });
});

describe('mentions', () => {
  const ings = [
    { id: 'chicken', name: 'chicken thighs' },
    { id: 'yogurt', name: 'yogurt' },
    { id: 'onion', name: 'onions' },
    { id: 'mint', name: 'mint leaves' },
    { id: 'chilli', name: 'red chilli powder' },
    { id: 'rice', name: 'basmati rice' },
  ];

  it('finds ingredient names, plurals and head nouns', () => {
    const text = 'Mix the chicken with the yogurt, add the onion, mint and chilli powder, then the rice.';
    const ids = findMentions(text, ings).map((m) => m.ingredientId);
    expect(ids).toEqual(['chicken', 'yogurt', 'onion', 'mint', 'chilli', 'rice']);
  });

  it('segments text for highlighting', () => {
    const text = 'Wash the rice.';
    const segs = segmentMentions(text, findMentions(text, ings));
    expect(segs).toEqual([{ text: 'Wash the ' }, { text: 'rice', ingredientId: 'rice' }, { text: '.' }]);
  });
});

describe('voice helpers', () => {
  it('splits dictation on "next"', () => {
    expect(splitOnSeparator('two onions next a cup of rice')).toEqual(['two onions', 'a cup of rice']);
    expect(splitOnSeparator('two onions next')).toEqual(['two onions', '']);
    expect(splitOnSeparator('put it next to the stove')).toEqual(['put it next to the stove']);
  });

  it('finds ingredients mentioned inside spoken steps', () => {
    const found = extractInlineIngredients('then boil three cups of rice with four cardamom for 7 minutes');
    expect(found.map((f) => f.name)).toEqual(['rice', 'cardamom']);
  });
});

describe('timers formatting', () => {
  it('formats durations and clocks', () => {
    expect(formatDuration(4500)).toBe('1 hr 15 min');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(isoDurationToMinutes('PT1H15M')).toBe(75);
    expect(isoDurationToMinutes('P0DT0H20M')).toBe(20);
  });
});

describe('schema.org import', () => {
  it('maps a Recipe from JSON-LD', () => {
    const r = recipeFromSchema(schemaFixture, 'https://example.com/banana')!;
    expect(r.title).toBe('Classic Banana Bread');
    expect(r.author).toBe('Jane Baker');
    expect(r.description).toBe('Moist and easy banana bread & a family favourite.');
    expect(r.servings).toBe(8);
    expect(r.prepMinutes).toBe(15);
    expect(r.cookMinutes).toBe(60);
    expect(r.imageUrl).toBe('https://example.com/banana.jpg');
    expect(r.ingredients).toHaveLength(8);
    expect(r.ingredients[7]).toMatchObject({ quantity: 1.5, unit: 'cup', name: 'all-purpose flour' });
    expect(r.steps.map((s) => s.text)).toEqual([
      'Preheat the oven to 350°F.',
      'Mix the butter into the mashed bananas.',
      'Mix in the sugar, egg and vanilla. Sprinkle the baking soda and salt over and mix. Add the flour.',
      'Bake for 1 hour, until a skewer comes out clean.',
    ]);
    expect(r.steps[3]!.timerSeconds).toBe(3600);
    expect(r.tags).toContain('Bread');
  });

  it('finds JSON-LD inside HTML', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify(schemaFixture)}</script></head></html>`;
    expect(recipeFromHtml(html)?.title).toBe('Classic Banana Bread');
    expect(recipeFromHtml('<html></html>')).toBeUndefined();
  });

  it('accepts plain string instructions', () => {
    const r = recipeFromSchema({ '@type': 'Recipe', name: 'X', recipeIngredient: ['1 egg'], recipeInstructions: 'Beat the egg.\nFry it.' });
    expect(r?.steps.map((s) => s.text)).toEqual(['Beat the egg.', 'Fry it.']);
  });
});
