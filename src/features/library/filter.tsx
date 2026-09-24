import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type SortKey = 'recent' | 'az' | 'mostCooked' | 'recentlyCooked';

export interface LibraryFilter {
  query: string;
  collectionId: string | null;
  tag: string | null;
  sort: SortKey;
}

interface Ctx extends LibraryFilter {
  set: (patch: Partial<LibraryFilter>) => void;
}

const FilterContext = createContext<Ctx | null>(null);

/** Search, collection, tag and sort, shared by the desktop sidebar and the recipe list. */
export function LibraryFilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryFilter>({ query: '', collectionId: null, tag: null, sort: 'recent' });
  const value = useMemo<Ctx>(() => ({ ...state, set: (patch) => setState((s) => ({ ...s, ...patch })) }), [state]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useLibraryFilter(): Ctx {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useLibraryFilter outside LibraryFilterProvider');
  return ctx;
}
