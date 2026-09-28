import { Link } from 'react-router';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { formatMinutes, totalMinutes } from '../../lib/format';
import { cx } from '../../ui/cx';
import { Photo } from '../../ui/Photo';

/** "Mom · 1 hr 45 min", and "Based on Mom's Pasta" for a version. */
function useCardLines(recipe: Recipe, parentTitle: string | undefined) {
  const t = useT();
  const meta = [recipe.author, formatMinutes(totalMinutes(recipe))].filter(Boolean).join(' · ');
  const extra = parentTitle ? t.ui.library.basedOnTitle(parentTitle) : undefined;
  return { meta, extra };
}

/** Phone cookbook card: a 4:3 photo (or stripes), the title, then who and how long. The whole card is one link. */
export function RecipeCard({ recipe, parentTitle }: { recipe: Recipe; parentTitle?: string }) {
  const { meta, extra } = useCardLines(recipe, parentTitle);
  return (
    <li className="min-w-0">
      <Link
        to={`/r/${recipe.id}`}
        className="group flex flex-col gap-2 rounded-lg text-ink no-underline transition-transform duration-(--dur) ease-(--ease-out) hover:-translate-y-0.5"
      >
        <Photo id={recipe.photoIds[0]} alt="" className="aspect-[4/3] w-full rounded-lg" />
        <span className="type-display text-lg leading-[1.12] text-balance">{recipe.title}</span>
        {(meta || extra) && (
          <span className="leading-[1.3] text-ink-muted">
            {meta}
            {meta && extra && <br />}
            {extra}
          </span>
        )}
      </Link>
    </li>
  );
}

/** Two columns at Normal on a phone; the minimum width puts Large and Huge in one column. Wider cards on desktop. */
export const cardGridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-x-3.5 gap-y-5.5 desk:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]';

/** Desktop list-pane row: a thumbnail, the title, and one line of detail. The selected row is lifted. */
export function RecipeRow({
  recipe,
  parentTitle,
  href,
  selected,
}: {
  recipe: Recipe;
  parentTitle?: string;
  href: string;
  selected?: boolean;
}) {
  const { meta, extra } = useCardLines(recipe, parentTitle);
  return (
    <li>
      <Link
        to={href}
        aria-current={selected ? 'true' : undefined}
        className={cx(
          'grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-[min(var(--radius-md),18px)] px-3 py-3 text-ink no-underline',
          selected ? 'bg-surface shadow-paper' : 'hover:bg-sunk',
        )}
      >
        <Photo id={recipe.photoIds[0]} alt="" className="size-14 rounded-sm" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="type-display text-lg leading-[1.15]">{recipe.title}</span>
          <span className="text-[0.875rem] text-ink-muted">{[meta, extra].filter(Boolean).join(' · ')}</span>
        </span>
      </Link>
    </li>
  );
}
