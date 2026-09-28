import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../db/types';
import { bookOrder, bookTitle, hasStory, sheetPages, startPages } from './book';

const r = (title: string, extra: Partial<Recipe> = {}) => ({ title, ...extra }) as Recipe;
const t = { kitchenOf: (n: string) => `${n}’s Kitchen`, defaultTitle: 'Our Family Kitchen' };

describe('the printed book', () => {
  it('starts after the cover and contents, and makes room for long recipes', () => {
    expect(startPages([1, 2, 1, 3])).toEqual([3, 4, 6, 7]);
    // A recipe never takes less than a page.
    expect(startPages([0, 1])).toEqual([3, 4]);
  });

  it('orders recipes by title', () => {
    expect(bookOrder([r('Nihari'), r('Aloo paratha'), r('Karahi')]).map((x) => x.title)).toEqual(['Aloo paratha', 'Karahi', 'Nihari']);
  });

  it('adds a story page only when there is a story to tell', () => {
    expect(hasStory(r('A'))).toBe(false);
    expect(hasStory(r('A', { story: [{ prompt: 'Who taught you this?', answer: '  ' }] }))).toBe(false);
    expect(hasStory(r('A', { story: [{ prompt: 'Who taught you this?', answer: 'My mother' }] }))).toBe(true);
    expect(hasStory(r('A', { transcript: 'okay so first' }))).toBe(true);
  });

  it('titles the book from Settings, then the usual author', () => {
    expect(bookTitle('Mom’s Kitchen', 'Nani', t)).toBe('Mom’s Kitchen');
    expect(bookTitle('', 'Nani', t)).toBe('Nani’s Kitchen');
    expect(bookTitle(' ', '', t)).toBe('Our Family Kitchen');
  });

  it('counts pages the way print breaks them: whole steps move to the next page', () => {
    // Fits on one page.
    expect(sheetPages([{ column: 0, top: 0, height: 900 }], [900], 1000)).toBe(1);
    // Ten 95px steps: 950px, one page.
    const steps = (n: number, h: number) => Array.from({ length: n }, (_, i) => ({ column: 0, top: i * h, height: h }));
    expect(sheetPages(steps(10, 95), [950], 1000)).toBe(1);
    // 11 × 95 = 1045: the eleventh moves over, so two pages.
    expect(sheetPages(steps(11, 95), [1045], 1000)).toBe(2);
    // 21 × 95 = 1995 fits in two pages by height, but each page only holds 10 whole steps.
    expect(sheetPages(steps(21, 95), [1995], 1000)).toBe(3);
    // Columns break independently: the longer one decides.
    expect(sheetPages([...steps(5, 95), ...steps(21, 95).map((b) => ({ ...b, column: 1 }))], [475, 1995], 1000)).toBe(3);
  });
});
