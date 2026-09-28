import { describe, expect, it } from 'vitest';
import { ingredientsToLines, linesToIngredients, minutesText, parseMinutes, splitTags, suggestForLine } from './model';

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

  it('reads prep and cook times', () => {
    expect(parseMinutes('30 min')).toBe(30);
    expect(parseMinutes('1 hr 15 min')).toBe(75);
    expect(parseMinutes('45')).toBe(45);
    expect(parseMinutes('an hour and a half')).toBe(90);
    expect(parseMinutes('soon')).toBeUndefined();
    expect(minutesText(75)).toBe('1 hr 15 min');
  });

  it('keeps parser checks with their lines', () => {
    const check = { reason: 'twoAmounts' as const };
    const ings = linesToIngredients([{ id: 'a', text: 'a pinch saffron in 2 tbsp warm milk', check }]);
    expect(ings[0]!.check).toEqual(check);
    expect(ingredientsToLines(ings)[0]!.check).toEqual(check);
  });

  it('splits tags', () => {
    expect(splitTags('Eid, rice,  family ,Eid')).toEqual(['Eid', 'rice', 'family']);
  });

  it('suggests ingredient names without touching the rest of the line', () => {
    const names = ['basmati rice', 'baking powder', 'rice', 'brown rice'];
    expect(suggestForLine('2 cups bas', names).map((s) => s.text)).toEqual(['2 cups basmati rice']);
    expect(suggestForLine('2 cups ric', names).map((s) => s.label)).toEqual(['rice', 'basmati rice', 'brown rice']);
    expect(suggestForLine('2 cups rice, washed', names)).toEqual([]);
    expect(suggestForLine('For the sauce:', names)).toEqual([]);
  });
});
