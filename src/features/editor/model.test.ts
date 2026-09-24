import { describe, expect, it } from 'vitest';
import { ingredientsToLines, linesToIngredients, suggestForLine } from './model';

describe('editor model', () => {
  it('turns typed lines into sectioned ingredients and back', () => {
    const lines = [
      { id: 'h', text: 'For the sauce:' },
      { id: 'a', text: '2 cups basmati rice, washed' },
      { id: 'b', text: '' },
      { id: 'c', text: 'salt to taste' },
    ];
    const ings = linesToIngredients(lines);
    expect(ings).toEqual([
      { id: 'a', quantity: 2, unit: 'cup', name: 'basmati rice', note: 'washed', section: 'For the sauce' },
      { id: 'c', unit: 'to taste', name: 'salt', section: 'For the sauce' },
    ]);
    const back = ingredientsToLines(ings);
    expect(back.map((l) => l.text)).toEqual(['For the sauce:', '2 cups basmati rice, washed', 'salt to taste']);
  });

  it('suggests units after a number', () => {
    expect(suggestForLine('2 ', []).map((s) => s.label)).toEqual(['cups', 'tbsp', 'tsp', 'g', 'kg']);
    expect(suggestForLine('2 t', []).map((s) => s.text)).toEqual(['2 tbsp ', '2 tsp ']);
    expect(suggestForLine('1 c', []).map((s) => s.label)).toEqual(['cup', 'clove', 'can']);
  });

  it('suggests ingredient names without touching the rest of the line', () => {
    const names = ['basmati rice', 'baking powder', 'rice', 'brown rice'];
    expect(suggestForLine('2 cups bas', names).map((s) => s.text)).toEqual(['2 cups basmati rice']);
    expect(suggestForLine('2 cups ric', names).map((s) => s.label)).toEqual(['rice', 'basmati rice', 'brown rice']);
    expect(suggestForLine('2 cups rice, washed', names)).toEqual([]);
    expect(suggestForLine('For the sauce:', names)).toEqual([]);
  });
});
