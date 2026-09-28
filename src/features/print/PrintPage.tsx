import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRecipes, useSettings } from '../../db/hooks';
import type { Ingredient, Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { ingredientParts } from '../../lib/parse/ingredient';
import { getUnit } from '../../lib/parse/units';
import { printPage } from '../../lib/platform/print';
import { Button, ButtonLink } from '../../ui/Button';
import { Segmented, Switch } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { Photo } from '../../ui/Photo';
import { metaLine } from '../recipe/meta';
import { bookOrder, bookTitle, FRONT_PAGES, hasStory, MARGIN, PAPER, sheetPages, startPages, type Paper } from './book';

/*
 * The printed book is laid out in CSS px, which print at 1/96 inch, so these sizes are fixed on paper
 * whatever the app's text size. Colours come from the .book-sheet tokens in src/styles/print.css.
 */

const PX_PER_MM = 96 / 25.4;
const toPx = (len: string) => parseFloat(len) * (len.endsWith('mm') ? PX_PER_MM : 96);

const caps = 'font-[500] text-[15px] leading-none tracking-[.24em] uppercase';

function Sheet({ front, flow, children, className }: { front?: boolean; flow?: boolean; children: ReactNode; className?: string }) {
  return <section className={cx('book-sheet', front && 'book-front', flow && 'book-flow', className)}>{children}</section>;
}

function Cover({ title, photoId }: { title: string; photoId?: string }) {
  const t = useT();
  const tp = t.ui.print;
  return (
    <Sheet front className="book-cover items-center pt-[calc(var(--sheet-my)+40px)] text-center">
      <span className={caps}>{tp.eyebrow}</span>
      <h1 className="type-display mt-[56px] text-[88px] leading-none tracking-[-0.03em] text-balance">{title}</h1>
      <span className="type-eyebrow mt-[22px] text-[26px]">{tp.subtitle}</span>
      {photoId && <Photo id={photoId} alt="" className="book-photo mt-[64px] h-[360px] w-[460px]" />}
      <span className="mt-auto text-[18px] leading-none font-bold tracking-[.12em]">{new Date().getFullYear()}</span>
    </Sheet>
  );
}

function Contents({ recipes, pages, titles }: { recipes: Recipe[]; pages: number[]; titles: Map<string, string> }) {
  const t = useT();
  const tp = t.ui.print;
  return (
    <Sheet front>
      <h1 className="type-display mb-[48px] text-[56px] leading-none tracking-[-0.02em]">{tp.contents}</h1>
      <ol>
        {recipes.map((r, i) => {
          const parent = r.forkedFromId ? titles.get(r.forkedFromId) : undefined;
          const meta = [r.author, hasStory(r) && tp.withStory, parent && tp.basedOn(parent)].filter(Boolean).join(' · ');
          return (
            <li
              key={r.id}
              className="book-avoid-break grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[24px] gap-y-[4px] border-b border-line py-[18px]"
            >
              <span className="type-display text-[28px] leading-[1.1]">{r.title}</span>
              <span className="text-[18px] leading-none font-bold tabular-nums">{pages[i]}</span>
              {meta && <span className="text-[17px] leading-[1.3]">{meta}</span>}
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}

/** Ingredients in their sections: "1 kg chicken, bone-in", the amount in bold. */
function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  const groups: { section?: string; items: Ingredient[] }[] = [];
  for (const i of ingredients) {
    const last = groups.at(-1);
    if (last && last.section === i.section) last.items.push(i);
    else groups.push({ section: i.section, items: [i] });
  }
  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi} className="book-avoid-break flex flex-col gap-[4px]">
          {g.section && <i className="type-display pt-[10px] text-[17px]">{g.section}</i>}
          {g.items.map((i) => {
            const p = ingredientParts(i);
            const unit = getUnit(i.unit);
            const amount = unit?.trailing ? '' : [p.quantity, p.unit].filter(Boolean).join(' ');
            return (
              <span key={i.id}>
                {amount && <b>{amount}</b>} {p.name}
                {p.note && `, ${p.note}`}
              </span>
            );
          })}
        </div>
      ))}
    </>
  );
}

function RecipeSheet({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const tp = t.ui.print;
  const tr = t.ui.recipe;
  const meta = metaLine(recipe, t);
  return (
    <Sheet flow className="gap-[24px] text-[16px] leading-[1.45]">
      <header className={cx('grid items-end gap-[32px]', recipe.photoIds[0] && 'grid-cols-[minmax(0,1fr)_220px]')}>
        <div className="flex flex-col gap-[10px]">
          {recipe.author && <span className="type-eyebrow text-[20px]">{t.ui.common.fromKitchen(recipe.author)}</span>}
          <h2 className="type-display text-[52px] leading-none tracking-[-0.02em]">{recipe.title}</h2>
          {meta.length > 0 && <span>{meta.join(' · ')}</span>}
        </div>
        {recipe.photoIds[0] && <Photo id={recipe.photoIds[0]} alt="" className="book-photo h-[165px] w-[220px]" />}
      </header>
      <div className="h-[2px] bg-ink" />
      <div className="grid grid-cols-[250px_minmax(0,1fr)] gap-[40px]">
        <div data-col className="flex flex-col gap-[4px]">
          <b className="type-display pb-[4px] text-[22px]">{tr.ingredients}</b>
          <IngredientList ingredients={recipe.ingredients} />
        </div>
        <div data-col className="flex flex-col gap-[14px]">
          <b className="type-display text-[22px]">{tr.steps}</b>
          <ol className="flex flex-col gap-[14px]">
            {recipe.steps.map((s, i) => (
              <li key={s.id} className="book-avoid-break grid grid-cols-[28px_minmax(0,1fr)] gap-[8px]">
                <b className="type-display text-[22px] leading-[1.1]">{i + 1}</b>
                <span className="text-[17px] text-pretty">{s.text}</span>
              </li>
            ))}
          </ol>
          {recipe.tips && (
            <p className="book-avoid-break mt-[8px] px-[18px] py-[14px] shadow-[inset_0_0_0_1.5px_var(--ink)]">
              <b>{tp.tip}</b> · {recipe.tips}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function StorySheet({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const tp = t.ui.print;
  const answers = recipe.story?.filter((s) => s.answer.trim()) ?? [];
  const [first, ...rest] = answers;
  return (
    <Sheet flow className="gap-[28px] px-[calc(var(--sheet-mx)+24px)] pt-[calc(var(--sheet-my)+48px)]">
      <span className={caps}>{tp.storyBehind(recipe.title)}</span>
      {first && (
        <>
          <span className="text-[20px] leading-[1.3] font-bold">{first.prompt}</span>
          <blockquote className="type-eyebrow text-[48px] leading-[1.15] tracking-[-0.01em] text-balance">
            “{first.answer.trim()}”
          </blockquote>
        </>
      )}
      {rest.map((s) => (
        <div key={s.prompt} className="book-avoid-break flex flex-col gap-[8px]">
          <span className="text-[18px] leading-[1.3] font-bold">{s.prompt}</span>
          <p className="type-eyebrow text-[26px] leading-[1.25]">“{s.answer.trim()}”</p>
        </div>
      ))}
      {recipe.transcript?.trim() && (
        <>
          <div className="h-[2px] w-[64px] bg-ink" />
          <span className="text-[18px] leading-[1.3] font-bold">{t.ui.recipe.inHerWords}</span>
          <p className="type-handwritten text-[22px] leading-[1.55] text-pretty">{recipe.transcript.trim()}</p>
        </>
      )}
    </Sheet>
  );
}

/** How many pages a sheet prints on, from where its unbreakable blocks sit in the screen layout. */
function measureSheet(sheet: HTMLElement, capacity: number): number {
  const margin = toPx(MARGIN.y);
  const contentTop = sheet.getBoundingClientRect().top + margin;
  const columns = [sheet, ...sheet.querySelectorAll<HTMLElement>('[data-col]')];
  const columnEnds = columns.map((c, i) => (i === 0 ? sheet.scrollHeight - 2 * margin : c.getBoundingClientRect().bottom - contentTop));
  const blocks = [...sheet.querySelectorAll<HTMLElement>('.book-avoid-break')].map((el) => {
    const r = el.getBoundingClientRect();
    const col = el.closest<HTMLElement>('[data-col]');
    return { column: col ? columns.indexOf(col) : 0, top: r.top - contentTop, height: r.height };
  });
  return sheetPages(blocks, columnEnds, capacity);
}

/**
 * How many pages each recipe (with its story) will print on. Re-measured when fonts or photos
 * change the layout.
 */
function usePageCounts(recipes: Recipe[], paper: Paper) {
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<number[]>([]);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const capacity = toPx(PAPER[paper].height) - 2 * toPx(MARGIN.y);
    const measure = () => {
      // Print layout drops the sheets' padding; keep the numbers from the screen layout.
      if (window.matchMedia('print').matches) return;
      const next = [...root.querySelectorAll<HTMLElement>('[data-book-recipe]')].map((group) =>
        [...group.querySelectorAll<HTMLElement>('.book-sheet')].reduce((sum, sheet) => sum + measureSheet(sheet, capacity), 0),
      );
      setCounts((prev) => (prev.length === next.length && prev.every((n, i) => n === next[i]) ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    root.querySelectorAll('.book-sheet').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [recipes, paper]);
  return { ref, counts };
}

export function PrintPage() {
  const t = useT();
  const tp = t.ui.print;
  const settings = useSettings();
  const all = useRecipes();
  const recipes = useMemo(() => bookOrder(all ?? []), [all]);
  const titles = useMemo(() => new Map(recipes.map((r) => [r.id, r.title])), [recipes]);
  const [paper, setPaper] = useState<Paper>(() => (navigator.language === 'en-US' || navigator.language === 'en-CA' ? 'letter' : 'a4'));
  const [withPhoto, setWithPhoto] = useState(true);
  const { ref, counts } = usePageCounts(recipes, paper);
  // Until measured, a page for each recipe and each story.
  const countFor = (r: Recipe, i: number) => counts[i] ?? (hasStory(r) ? 2 : 1);
  const pages = startPages(recipes.map(countFor));
  const coverPhoto = recipes.find((r) => r.photoIds.length)?.photoIds[0];
  const title = bookTitle(settings.cookbookTitle, settings.defaultAuthor, tp);
  const total = FRONT_PAGES + recipes.reduce((sum, r, i) => sum + countFor(r, i), 0);

  const sheetVars = {
    '--sheet-w': PAPER[paper].width,
    '--sheet-h': PAPER[paper].height,
    '--sheet-my': MARGIN.y,
    '--sheet-mx': MARGIN.x,
  } as CSSProperties;

  if (!all) return null;
  return (
    <div className="min-h-dvh bg-sunk" style={sheetVars}>
      <style>{`@page { size: ${PAPER[paper].css}; }`}</style>
      <header className="no-print sticky top-0 z-10 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 desk:px-10">
          <ButtonLink href="/settings" variant="quiet" icon="back" className="-ml-3">
            {tp.back}
          </ButtonLink>
          <div className="flex min-w-[min(100%,18rem)] flex-1 flex-col">
            <h1 className="text-2xl leading-[1.1]">{tp.pageTitle}</h1>
            {recipes.length > 0 && (
              <p className="text-ink-muted">
                {tp.pages(total)} · {tp.titleHint}
              </p>
            )}
          </div>
          {recipes.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Segmented<Paper>
                label={tp.paper}
                labelHidden
                value={paper}
                onChange={setPaper}
                options={(['letter', 'a4'] as const).map((id) => ({ id, label: tp.papers[id] }))}
              />
              {coverPhoto && (
                <Switch isSelected={withPhoto} onChange={setWithPhoto} className="min-h-14 border-b-0">
                  {tp.coverPhoto}
                </Switch>
              )}
              <Button variant="primary" icon="print" onPress={() => printPage(title)}>
                {tp.print}
              </Button>
            </div>
          )}
        </div>
      </header>
      {recipes.length === 0 ? (
        <p className="mx-auto max-w-xl px-5 py-12 text-lg">{tp.empty}</p>
      ) : (
        // Wide enough for a sheet: on a phone the preview scrolls sideways (the paper doesn't reflow).
        <div className="overflow-x-auto print:overflow-visible">
          <div
            ref={ref}
            aria-label={tp.preview}
            role="region"
            className="flex w-max min-w-full flex-col gap-10 px-5 py-10 print:block print:w-auto print:p-0"
          >
            <Cover title={title} photoId={withPhoto ? coverPhoto : undefined} />
            <Contents recipes={recipes} pages={pages} titles={titles} />
            {recipes.map((r) => (
              <div key={r.id} data-book-recipe className="contents">
                <RecipeSheet recipe={r} />
                {hasStory(r) && <StorySheet recipe={r} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
