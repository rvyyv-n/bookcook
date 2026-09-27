import MiniSearch from 'minisearch';
import { useMemo } from 'react';
import type { Recipe } from '../../db/types';
import type { LibraryFilter } from './filter';

interface Doc {
  id: string;
  title: string;
  author: string;
  ingredients: string;
  tags: string;
  description: string;
}

function toDoc(r: Recipe): Doc {
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    ingredients: r.ingredients.map((i) => i.name).join(' '),
    tags: r.tags.join(' '),
    description: [r.description, r.tips, ...(r.story ?? []).map((s) => s.answer)].filter(Boolean).join(' '),
  };
}

export function buildIndex(recipes: Recipe[]): MiniSearch<Doc> {
  const index = new MiniSearch<Doc>({
    fields: ['title', 'author', 'ingredients', 'tags', 'description'],
    searchOptions: { boost: { title: 3, tags: 2, ingredients: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(recipes.map(toDoc));
  return index;
}

const sorters: Record<LibraryFilter['sort'], (a: Recipe, b: Recipe) => number> = {
  recent: (a, b) => b.createdAt - a.createdAt,
  az: (a, b) => a.title.localeCompare(b.title),
  mostCooked: (a, b) => b.cookedCount - a.cookedCount || a.title.localeCompare(b.title),
  recentlyCooked: (a, b) => (b.lastCookedAt ?? 0) - (a.lastCookedAt ?? 0) || b.createdAt - a.createdAt,
};

/** Apply search, collection and sort. Search results keep relevance order. */
export function useFilteredRecipes(recipes: Recipe[] | undefined, filter: LibraryFilter): Recipe[] | undefined {
  const index = useMemo(() => (recipes ? buildIndex(recipes) : undefined), [recipes]);
  return useMemo(() => {
    if (!recipes || !index) return undefined;
    let list = recipes;
    if (filter.collectionId) list = list.filter((r) => r.collectionIds.includes(filter.collectionId!));
    const q = filter.query.trim();
    if (q) {
      const rank = new Map(index.search(q).map((hit, i) => [hit.id as string, i]));
      return list.filter((r) => rank.has(r.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
    return [...list].sort(sorters[filter.sort]);
  }, [recipes, index, filter.collectionId, filter.query, filter.sort]);
}
