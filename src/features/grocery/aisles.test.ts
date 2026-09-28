import { describe, expect, it } from 'vitest';
import type { GroceryItem } from '../../db/types';
import { groupByAisle } from './aisles';

const item = (name: string, aisle: string | undefined, order: number): GroceryItem => ({
  id: name,
  name,
  aisle,
  order,
  checked: false,
  fromRecipeIds: [],
});

describe('groupByAisle', () => {
  it('groups in shop order and keeps list order inside an aisle', () => {
    const groups = groupByAisle([
      item('rice', 'Pantry', 3),
      item('onions', 'Produce', 2),
      item('mint', 'Produce', 1),
      item('chicken', 'Meat & fish', 4),
    ]);
    expect(groups.map((g) => g.aisle)).toEqual(['Produce', 'Meat & fish', 'Pantry']);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['mint', 'onions']);
  });

  it('puts unknown and missing aisles under Other, last', () => {
    const groups = groupByAisle([item('twine', undefined, 1), item('foil', 'Hardware', 2), item('milk', 'Dairy & eggs', 3)]);
    expect(groups.map((g) => g.aisle)).toEqual(['Dairy & eggs', 'Other']);
    expect(groups[1]!.items.map((i) => i.name)).toEqual(['twine', 'foil']);
  });
});
