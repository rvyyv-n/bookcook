import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { useCollections, useDrafts, useRecipes, useRequests } from '../../db/hooks';
import type { Recipe, RecipeRequest } from '../../db/types';
import { useT } from '../../i18n';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Icon, type IconName } from '../../ui/Icon';
import { Chip } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { SearchField } from '../../ui/Field';
import { ChoiceMenu } from '../../ui/Menu';
import { useToast } from '../../ui/Toast';
import { RecipeView } from '../recipe/RecipeDetail';
import { addExampleRecipes } from './examples';
import { useLibraryFilter, type SortKey } from './filter';
import { cardGridClass, RecipeCard, RecipeRow } from './RecipeCard';
import { useFilteredRecipes } from './search';
import { DeskPromptCard, DraftCard, RequestCard, useTellIt } from './SpecialCards';

const SORTS: SortKey[] = ['recent', 'az', 'mostCooked', 'recentlyCooked'];

/** Everything the cookbook shows, from one set of live queries. */
function useCookbook() {
  const t = useT();
  const recipes = useRecipes();
  const drafts = useDrafts();
  const requests = useRequests();
  const collections = useCollections();
  const filter = useLibraryFilter();
  const list = useFilteredRecipes(recipes, filter);
  const titles = useMemo(() => new Map(recipes?.map((r) => [r.id, r.title])), [recipes]);
  const openRequests = (requests ?? []).filter((r) => r.direction === 'incoming' && !r.fulfilledRecipeId);
  const q = filter.query.trim().toLowerCase();
  const searching = q !== '';
  const matchingRequest = searching
    ? openRequests.find((r) => r.title.toLowerCase().includes(q) || q.includes(r.title.toLowerCase()))
    : undefined;
  const count = list?.length ?? 0;
  const collection = collections?.find((c) => c.id === filter.collectionId);
  // "All recipes · 5", or the chosen collection, or the number of search results.
  const listTitle = searching ? t.ui.library.count(count) : collection ? `${collection.name} · ${count}` : t.ui.library.allRecipes(count);
  return {
    recipes,
    list,
    filter,
    searching,
    listTitle,
    collections,
    draft: drafts?.[0],
    openRequests,
    matchingRequest,
    parentTitle: (r: Recipe) => (r.forkedFromId ? titles.get(r.forkedFromId) : undefined),
  };
}
type CookbookData = ReturnType<typeof useCookbook>;

function Greeting({ className }: { className: string }) {
  const t = useT();
  return <h1 className={cx('leading-none tracking-[-0.02em]', className)}>{t.ui.library.greeting(new Date().getHours())}</h1>;
}

function Search({ desktop }: { desktop?: boolean }) {
  const t = useT();
  const filter = useLibraryFilter();
  return (
    <SearchField
      id="library-search"
      label={t.ui.library.search}
      placeholder={t.ui.library.searchPlaceholder}
      value={filter.query}
      onChange={(query) => filter.set({ query })}
      compact
      shortcut={desktop ? '/' : undefined}
    />
  );
}

function CollectionChips({ data, desktop }: { data: CookbookData; desktop?: boolean }) {
  const t = useT();
  const { collections, filter } = data;
  if (!collections?.length) return null;
  return (
    <div
      role="group"
      aria-label={t.ui.nav.collections}
      className={cx('flex', desktop ? 'flex-wrap gap-2' : '-mx-5 gap-2 overflow-x-auto px-5 pt-3.5 pb-1 [scrollbar-width:none]')}
    >
      <Chip small={desktop} isSelected={!filter.collectionId} onPress={() => filter.set({ collectionId: null })}>
        {t.ui.library.all}
      </Chip>
      {collections.map((c) => (
        <Chip
          key={c.id}
          small={desktop}
          isSelected={filter.collectionId === c.id}
          onPress={() => filter.set({ collectionId: filter.collectionId === c.id ? null : c.id })}
        >
          {c.name}
        </Chip>
      ))}
    </div>
  );
}

function SortMenu() {
  const t = useT();
  const filter = useLibraryFilter();
  return (
    <ChoiceMenu<SortKey>
      label={t.ui.library.sortLabel}
      icon="sort"
      value={filter.sort}
      onChange={(sort) => filter.set({ sort })}
      options={SORTS.map((id) => ({ id, label: t.ui.library.sort[id] }))}
    />
  );
}

const EMPTY_ICONS: IconName[] = ['mic', 'tidy', 'startCooking'];

/**
 * First run: a sample recipe card, the question, how saving one goes, and the one big button.
 * "Try an example" fills the cookbook for a look around.
 */
function EmptyCookbook() {
  const t = useT();
  const tl = t.ui.library;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Coming from the welcome screen, focus lands on the heading so a screen reader starts here.
  const welcomed = (useLocation().state as { welcomed?: boolean } | null)?.welcomed;
  useEffect(() => {
    if (welcomed) heading.current?.focus();
  }, [welcomed]);
  const sample = tl.emptySampleRecipe;
  return (
    <EmptyState
      id="cookbook-empty"
      className="w-full max-w-5xl desk:my-auto"
      headingLevel={1}
      headingRef={heading}
      sampleLabel={tl.emptySample}
      sample={
        <>
          {/* Where the photo goes: the pot, on the accent's soft tint. */}
          <span aria-hidden className="grid h-28 place-items-center rounded-[min(var(--radius-md),18px)] bg-accent-soft text-accent-text">
            <Icon name="startCooking" size="2.6rem" />
          </span>
          <p className="type-eyebrow text-ink-muted">{t.ui.common.fromKitchen(sample.author)}</p>
          <p className="type-display text-2xl leading-[1.05]">{sample.title}</p>
          <p className="text-ink-muted">
            {t.ui.common.minutes(sample.minutes)} · {t.ui.common.serves(sample.serves)}
          </p>
          <p className="type-handwritten text-lg leading-[1.3] text-ink-muted">“{sample.quote}”</p>
        </>
      }
      eyebrow={tl.emptyEyebrow}
      title={tl.emptyTitle}
      steps={tl.emptySteps.map((step, i) => ({ icon: EMPTY_ICONS[i]!, ...step }))}
      action={
        <div className="flex flex-col gap-1 desk:flex-row desk:flex-wrap desk:items-center desk:gap-2">
          <ButtonLink href="/new" variant="primary" icon="mic" className="w-full pr-6 pl-[1.2rem] desk:w-auto">
            {tl.emptyAction}
          </ButtonLink>
          <Button
            variant="quiet"
            className="self-center desk:self-auto"
            isDisabled={busy}
            onPress={async () => {
              setBusy(true);
              await addExampleRecipes();
              toast.show({ message: tl.examplesAdded, tone: 'success' });
              setBusy(false);
            }}
          >
            {tl.tryExample}
          </Button>
        </div>
      }
    />
  );
}

/** Search found nothing. If someone already asked for it, say so: that's the recipe to save next. */
function NoResults({ query, request }: { query: string; request?: RecipeRequest }) {
  const t = useT();
  const tellIt = useTellIt();
  const trimmed = query.trim();
  return (
    <section className="flex flex-col gap-3.5 px-2 py-10">
      <h2 className="text-2xl leading-[1.1]">{t.ui.library.noResults(trimmed)}</h2>
      <p className="text-ink-muted">
        {request ? t.ui.library.noResultsRequest(request.requestedBy || t.ui.library.someone) : t.ui.library.noResultsHint}
      </p>
      <div className="flex flex-wrap gap-2.5 pt-1.5">
        <Button variant="primary" icon="mic" onPress={() => tellIt(request?.title ?? trimmed, request?.id)}>
          {t.ui.library.tellIt}
        </Button>
        <ButtonLink href={`/requests?ask=${encodeURIComponent(request?.title ?? trimmed)}`} variant="secondary" icon="send">
          {t.ui.library.askForIt}
        </ButtonLink>
      </div>
    </section>
  );
}

function CookbookPhone() {
  const t = useT();
  const data = useCookbook();
  const { recipes, list, filter, searching } = data;
  if (recipes === undefined) return null;
  if (!recipes.length)
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
        <EmptyCookbook />
      </div>
    );
  return (
    <div className="flex flex-col pt-2">
      <div className="flex flex-col gap-4">
        {!searching && <Greeting className="text-3xl" />}
        <Search />
      </div>
      {!searching && <CollectionChips data={data} />}
      {!searching && (data.draft || data.openRequests.length > 0) && (
        <div className="flex flex-col gap-3 pt-4">
          {data.draft && <DraftCard draft={data.draft} />}
          {data.openRequests.slice(0, 2).map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
      {list && list.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 pt-6.5 pb-1.5">
            <h2 className="type-heading text-xl" aria-live="polite">
              {data.listTitle}
            </h2>
            {!searching && <SortMenu />}
          </div>
          <ul className={cx(cardGridClass, 'pt-1.5 pb-7')} aria-label={t.ui.library.recipes}>
            {list.map((r) => (
              <RecipeCard key={r.id} recipe={r} parentTitle={data.parentTitle(r)} />
            ))}
          </ul>
        </>
      ) : searching ? (
        <NoResults query={filter.query} request={data.matchingRequest} />
      ) : (
        <p className="py-10 text-lg text-ink-muted">{t.ui.library.emptyFilter}</p>
      )}
    </div>
  );
}

/** Desktop: the searchable list pane, and the selected recipe beside it. */
function CookbookDesktop() {
  const t = useT();
  const data = useCookbook();
  const { recipes, list, filter, searching } = data;
  const [params] = useSearchParams();
  if (recipes === undefined) return null;
  if (!recipes.length)
    return (
      <div className="flex h-full justify-center px-10">
        <EmptyCookbook />
      </div>
    );
  const selected = list?.find((r) => r.id === params.get('r')) ?? list?.[0];
  return (
    <div className="flex h-full">
      <section
        aria-label={t.ui.library.recipes}
        className="no-print flex w-[380px] flex-none flex-col overflow-y-auto border-r border-line"
      >
        <div className="flex flex-col gap-4.5 px-6 pt-7 pb-4">
          <Greeting className="text-2xl" />
          <Search desktop />
          <CollectionChips data={data} desktop />
        </div>
        {!searching && <DeskPromptCard request={data.openRequests[0]} draft={data.draft} />}
        {list && list.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-2 pt-4 pr-4 pl-6">
              <h2 className="type-heading text-lg" aria-live="polite">
                {data.listTitle}
              </h2>
              {!searching && <SortMenu />}
            </div>
            <ul className="flex flex-col gap-1 px-3 pt-2.5 pb-6" aria-label={t.ui.library.recipes}>
              {list.map((r) => (
                <RecipeRow key={r.id} recipe={r} parentTitle={data.parentTitle(r)} href={`/?r=${r.id}`} selected={r.id === selected?.id} />
              ))}
            </ul>
          </>
        ) : searching ? (
          <div className="px-3">
            <NoResults query={filter.query} request={data.matchingRequest} />
          </div>
        ) : (
          <p className="px-5 py-8 text-ink-muted">{t.ui.library.emptyFilter}</p>
        )}
      </section>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <RecipeView key={selected.id} recipe={selected} layout="pane" />
        ) : (
          <p className="type-display grid h-full place-items-center text-2xl text-ink-muted italic">{t.ui.library.selectRecipe}</p>
        )}
      </div>
    </div>
  );
}

export function CookbookPage() {
  return useIsDesktop() ? <CookbookDesktop /> : <CookbookPhone />;
}
