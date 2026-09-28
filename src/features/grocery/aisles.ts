import type { GroceryItem } from '../../db/types';
import { AISLES, type Aisle } from '../../lib/parse/aisles';

export interface AisleGroup {
  aisle: Aisle;
  items: GroceryItem[];
}

const known = new Set<string>(AISLES);

/** Items grouped by aisle in shop order (Produce first, Other last), each keeping its list order. */
export function groupByAisle(items: GroceryItem[]): AisleGroup[] {
  const by = new Map<Aisle, GroceryItem[]>();
  for (const item of [...items].sort((a, b) => a.order - b.order)) {
    const aisle = (item.aisle && known.has(item.aisle) ? item.aisle : 'Other') as Aisle;
    by.set(aisle, [...(by.get(aisle) ?? []), item]);
  }
  return AISLES.filter((a) => by.has(a)).map((aisle) => ({ aisle, items: by.get(aisle)! }));
}
