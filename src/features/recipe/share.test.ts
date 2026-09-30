import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../db/types';
import { en } from '../../i18n/en';
import { recipeAsText } from './share';

const recipe = {
  id: 'r1',
  title: 'Banana Bread',
  author: 'Nani',
  servings: 8,
  prepMinutes: 15,
  photoIds: [],
  tags: [],
  ingredients: [
    { id: 'a', name: 'ripe bananas', quantity: 3, note: 'mashed' },
    { id: 'b', name: 'flour', quantity: 250, unit: 'g', section: 'Dry' },
    { id: 'c', name: 'baking soda', quantity: 1, unit: 'tsp', section: 'Dry' },
  ],
  steps: [
    { id: 's1', text: 'Mash the bananas.' },
    { id: 's2', text: '  ' },
    { id: 's3', text: 'Bake for 50 minutes.' },
  ],
  story: [{ prompt: 'When do you make it?', answer: 'Whenever the bananas go spotty.' }],
  tips: 'Wrap it overnight.',
} as unknown as Recipe;

describe('a recipe as text', () => {
  const text = recipeAsText(recipe, en);

  it('opens with the title, whose it is and the timings, then the story', () => {
    expect(text.split('\n').slice(0, 4)).toEqual([
      'Banana Bread',
      'From Nani’s kitchen · Serves 8 · Prep 15 min',
      '',
      '“Whenever the bananas go spotty.”',
    ]);
  });

  it('lists the ingredients under their sections, once per section', () => {
    expect(text).toContain('• 3 ripe bananas, mashed\nDry:\n• 250 g flour\n• 1 tsp baking soda');
  });

  it('numbers the steps, skipping empty ones, and ends with the tips', () => {
    expect(text).toContain('1. Mash the bananas.\n2. Bake for 50 minutes.');
    expect(text.endsWith('TIPS\nWrap it overnight.')).toBe(true);
  });
});
