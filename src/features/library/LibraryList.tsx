import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useCollections, useDrafts, useRecipes, useRequests, useSettings, useTags } from '../../db/hooks';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { formatMinutes, totalMinutes } from '../../lib/format';
import { Button, ButtonLink } from '../../ui/Button';
import { Chip } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { SearchField } from '../../ui/Field';
import { Photo } from '../../ui/Photo';
import { SelectField } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { addExampleRecipes } from './examples';
import { useLibraryFilter, type SortKey } from './filter';
import { useFilteredRecipes } from './search';
import { DraftCard, RequestCard } from './SpecialCards';

export function RecipeRow({ recipe, active }: { recipe: Recipe; active?: boolean }) {
  const t = useT();
  const time = formatMinutes(totalMinutes(recipe));
  const meta = [time, recipe.cookedCount ? t.ui.common.madeTimes(recipe.cookedCount) : undefined].filter(Boolean);
  return (
    <li>
      <Link
        to={`/r/${recipe.id}`}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'group -mx-3 flex items-center gap-4 rounded-lg px-3 py-4 no-underline transition-colors outline-none',
          'hover:bg-sunk focus-visible:outline-3 focus-visible:outline-(--focus)',
          active && 'bg-accent-soft hover:bg-accent-soft',
        )}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-xl text-ink">{recipe.title}</h3>
          {recipe.author && <p className="mt-0.5 font-display-soft text-ink-muted italic">{t.ui.common.fromKitchen(recipe.author)}</p>}
          {meta.length > 0 && <p className="mt-1 text-sm text-ink-muted">{meta.join(' · ')}</p>}
          {recipe.forkedFromId && <p className="mt-1 text-sm text-accent-text">{t.ui.recipe.versionBy(recipe.author || '…')}</p>}
        </div>
        {recipe.photoIds[0] && <Photo id={recipe.photoIds[0]} alt="" className="size-22 shrink-0 rounded-md" />}
      </Link>
    </li>
  );
}

function EmptyCookbook() {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex flex-col items-start gap-6 py-10">
      <p className="font-display-soft text-4xl leading-[1.05] font-medium tracking-tight text-balance">{t.ui.library.emptyTitle}</p>
      <p className="max-w-[34ch] text-lg text-ink-muted">{t.ui.library.emptyBody}</p>
      <ButtonLink href="/new" variant="primary" size="xl" icon="plus">
        {t.ui.library.emptyAction}
      </ButtonLink>
      <Button
        variant="quiet"
        isDisabled={busy}
        onPress={async () => {
          setBusy(true);
          await addExampleRecipes();
          toast.show({ message: t.ui.library.examplesAdded, tone: 'success' });
          setBusy(false);
        }}
      >
        {t.ui.library.tryExample}
      </Button>
    </section>
  );
}

/** The cookbook: greeting, search, filters, special cards and the recipe index. */
export function LibraryList({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { id: activeId } = useParams();
  const recipes = useRecipes();
  const drafts = useDrafts();
  const requests = useRequests();
  const collections = useCollections();
  const tags = useTags();
  const settings = useSettings();
  const filter = useLibraryFilter();
  const list = useFilteredRecipes(recipes, filter);
  const openRequests = (requests ?? []).filter((r) => !r.fulfilledRecipeId).slice(0, 2);

  if (recipes === undefined) return <p className="p-6 text-ink-muted">{t.ui.common.loading}</p>;

  const hasRecipes = recipes.length > 0;
  const filtered = filter.collectionId !== null || filter.tag !== null || filter.query.trim() !== '';

  return (
    <div className="flex flex-col gap-5">
      {!compact && (
        <header className="pt-2">
          <h1 className="text-3xl">{t.ui.library.greeting(new Date().getHours())}</h1>
          {settings.cookbookTitle && <p className="font-display-soft text-lg text-ink-muted italic">{settings.cookbookTitle}</p>}
        </header>
      )}

      {drafts?.slice(0, 1).map((d) => (
        <DraftCard key={d.id} draft={d} />
      ))}
      {openRequests.map((r) => (
        <RequestCard key={r.id} request={r} />
      ))}

      {!hasRecipes ? (
        <EmptyCookbook />
      ) : (
        <>
          <SearchField
            label={t.ui.library.search}
            placeholder={t.ui.library.searchPlaceholder}
            value={filter.query}
            onChange={(query) => filter.set({ query })}
            id="library-search"
          />
          {!compact && (collections?.length || tags?.length) ? (
            <div
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]"
              role="group"
              aria-label={t.ui.nav.collections}
            >
              <Chip isSelected={!filter.collectionId && !filter.tag} onPress={() => filter.set({ collectionId: null, tag: null })}>
                {t.ui.library.all}
              </Chip>
              {collections?.map((c) => (
                <Chip
                  key={c.id}
                  isSelected={filter.collectionId === c.id}
                  onPress={() => filter.set({ collectionId: filter.collectionId === c.id ? null : c.id, tag: null })}
                >
                  {c.emoji && <span aria-hidden>{c.emoji}</span>}
                  {c.name}
                </Chip>
              ))}
              {tags?.map((tag) => (
                <Chip
                  key={tag}
                  isSelected={filter.tag === tag}
                  onPress={() => filter.set({ tag: filter.tag === tag ? null : tag, collectionId: null })}
                >
                  <span className="text-ink-muted" aria-hidden>
                    #
                  </span>
                  {tag}
                </Chip>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="whitespace-nowrap text-ink-muted" aria-live="polite">
              {t.ui.library.count(list?.length ?? 0)}
            </p>
            {!filter.query && (
              <SelectField<SortKey>
                label={t.ui.library.sortLabel}
                labelHidden
                icon="sort"
                value={filter.sort}
                onChange={(sort) => filter.set({ sort })}
                options={(['recent', 'az', 'mostCooked', 'recentlyCooked'] as const).map((id) => ({ id, label: t.ui.library.sort[id] }))}
              />
            )}
          </div>
          {list && list.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line" aria-label={t.ui.library.recipes}>
              {list.map((r) => (
                <RecipeRow key={r.id} recipe={r} active={r.id === activeId} />
              ))}
            </ul>
          ) : (
            <div className="py-8">
              <p className="font-display-soft text-xl">{filter.query ? t.ui.library.noResults(filter.query) : t.ui.library.emptyFilter}</p>
              {filtered && <p className="text-ink-muted">{t.ui.library.noResultsHint}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
