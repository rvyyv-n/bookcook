import type { Recipe } from '../../db/types';

/** The cover and the contents page come before the recipes (and are counted in the page numbers). */
export const FRONT_PAGES = 2;

export type Paper = 'letter' | 'a4';

/** Sheet size, and the @page margins (the same on screen, so the preview paginates like the paper). */
export const PAPER: Record<Paper, { width: string; height: string; css: string }> = {
  letter: { width: '8.5in', height: '11in', css: 'letter' },
  a4: { width: '210mm', height: '297mm', css: 'A4' },
};
export const MARGIN = { y: '16mm', x: '18mm' };

/** A story page follows the recipe when there's something to put on it. */
export function hasStory(r: Recipe): boolean {
  return !!r.story?.some((s) => s.answer.trim()) || !!r.transcript?.trim();
}

/** The recipes in book order: A to Z by title. */
export function bookOrder(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The page each recipe starts on, given how many pages each recipe (with its story page) takes.
 * Numbers count every sheet, cover and contents included, as the printed footers do.
 */
export function startPages(pageCounts: number[]): number[] {
  let next = FRONT_PAGES + 1;
  return pageCounts.map((n) => {
    const start = next;
    next += Math.max(1, n);
    return start;
  });
}

/** "Mom's Kitchen": the title from Settings, else the usual author's kitchen, else a plain one. */
export function bookTitle(
  cookbookTitle: string,
  defaultAuthor: string,
  t: { kitchenOf: (n: string) => string; defaultTitle: string },
): string {
  return cookbookTitle.trim() || (defaultAuthor.trim() ? t.kitchenOf(defaultAuthor.trim()) : t.defaultTitle);
}

/** Something on a sheet that prints whole (a step, an ingredient section), by where it sits on screen. */
export interface Block {
  /** Which column it flows in: columns side by side break across pages independently. */
  column: number;
  top: number;
  height: number;
}

/**
 * How many pages a sheet prints on. Walks each column's unbreakable blocks as print does: one that
 * would cross the foot of a page moves to the top of the next, pushing everything after it down.
 * `columnEnds` is where each column's content ends (in px from the top of the content area).
 */
export function sheetPages(blocks: Block[], columnEnds: number[], capacity: number): number {
  const shift = columnEnds.map(() => 0);
  for (const b of blocks) {
    const top = b.top + shift[b.column]!;
    const pageEnd = (Math.floor(top / capacity) + 1) * capacity;
    // A block taller than a page splits anyway, so it isn't moved.
    if (top + b.height > pageEnd + 0.5 && b.height <= capacity) shift[b.column]! += pageEnd - top;
  }
  const end = Math.max(...columnEnds.map((e, i) => e + shift[i]!));
  return Math.max(1, Math.ceil((end - 0.5) / capacity));
}
