import { describe, expect, it } from 'vitest';
import { readRecipeLink, readRequestLink, recipeLink, requestLink } from './shareLink';

describe('request links', () => {
  it('round-trips a request, accents and quotes included', () => {
    const link = requestLink(
      { id: 'r1', title: 'Nani’s nihari', from: 'Rayyan', note: 'The one from “Eid” 🍲' },
      'https://x.dev',
      '/bookcook/',
    );
    expect(link.startsWith('https://x.dev/bookcook/import#request=')).toBe(true);
    expect(readRequestLink(new URL(link).hash)).toEqual({
      id: 'r1',
      title: 'Nani’s nihari',
      from: 'Rayyan',
      note: 'The one from “Eid” 🍲',
    });
  });

  it('leaves out what was not given', () => {
    const link = requestLink({ id: 'r2', title: 'Karahi' }, 'https://x.dev', '/');
    expect(readRequestLink(new URL(link).hash)).toEqual({ id: 'r2', title: 'Karahi', from: undefined, note: undefined });
  });

  it('rejects a missing, cut-short or empty fragment', () => {
    expect(readRequestLink('')).toBeUndefined();
    expect(readRequestLink('#request=eyJpIjoi')).toBeUndefined();
    expect(readRequestLink('#request=' + btoa('{"i":"x","t":"  "}'))).toBeUndefined();
  });
});

describe('recipe links', () => {
  const recipe = {
    title: 'Nani’s nihari',
    author: 'Nani',
    servings: 6,
    cookMinutes: 360,
    tags: ['Eid', 'slow'],
    ingredients: [
      { id: 'a', name: 'beef shank', quantity: 1, unit: 'kg', section: 'Meat' },
      { id: 'b', name: 'ginger', quantity: [1, 2] as [number, number], unit: 'tbsp', note: 'grated' },
      { id: 'c', name: 'salt' },
    ],
    steps: [
      { id: 's1', text: 'Brown the meat.' },
      { id: 's2', text: 'Cover and cook low.', timerSeconds: 21600, photoId: 'p1' },
    ],
    tips: 'Don’t rush it.',
    story: [{ prompt: 'Who taught you?', answer: 'My mother 🍲', audioId: 'v1' }],
    photoIds: ['p0'],
  };

  it('round-trips the text of a recipe, and leaves photos and voice notes behind', () => {
    const link = recipeLink({ id: 'r1', recipe, requestId: 'q1' }, 'https://x.dev', '/bookcook/');
    expect(link.startsWith('https://x.dev/bookcook/import#recipe=')).toBe(true);
    const shared = readRecipeLink(new URL(link).hash)!;
    expect(shared.id).toBe('r1');
    expect(shared.requestId).toBe('q1');
    expect(shared.recipe).toMatchObject({
      title: 'Nani’s nihari',
      author: 'Nani',
      servings: 6,
      cookMinutes: 360,
      tags: ['Eid', 'slow'],
      tips: 'Don’t rush it.',
      story: [{ prompt: 'Who taught you?', answer: 'My mother 🍲' }],
    });
    expect(shared.recipe.ingredients).toEqual([
      { name: 'beef shank', quantity: 1, unit: 'kg', note: undefined, section: 'Meat' },
      { name: 'ginger', quantity: [1, 2], unit: 'tbsp', note: 'grated', section: undefined },
      { name: 'salt', quantity: undefined, unit: undefined, note: undefined, section: undefined },
    ]);
    expect(shared.recipe.steps).toEqual([
      { text: 'Brown the meat.', timerSeconds: undefined },
      { text: 'Cover and cook low.', timerSeconds: 21600 },
    ]);
    expect(shared.recipe.story?.[0]).not.toHaveProperty('audioId');
    expect(shared.recipe).not.toHaveProperty('photoIds');
  });

  it('is compressed', () => {
    const long = {
      ...recipe,
      steps: Array.from({ length: 20 }, (_, n) => ({ id: `${n}`, text: `Stir the pot and taste it again (${n}).` })),
    };
    const link = recipeLink({ id: 'r1', recipe: long }, '', '/');
    expect(link.length).toBeLessThan(JSON.stringify(long).length);
  });

  it('rejects a missing or damaged fragment, and a request link', () => {
    const link = recipeLink({ id: 'r1', recipe }, 'https://x.dev', '/');
    expect(readRecipeLink('')).toBeUndefined();
    expect(readRecipeLink(new URL(link).hash.slice(0, 40))).toBeUndefined();
    expect(readRecipeLink(new URL(requestLink({ id: 'r2', title: 'Karahi' }, 'https://x.dev', '/')).hash)).toBeUndefined();
  });
});
