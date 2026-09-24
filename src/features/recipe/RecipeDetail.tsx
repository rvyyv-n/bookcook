import { useState } from 'react';
import { Disclosure, DisclosurePanel, Button as AriaButton, Heading } from 'react-aria-components';
import { Link, useNavigate, useParams } from 'react-router';
import { setRecipeCollections } from '../../db/collections';
import { addToGrocery } from '../../db/grocery';
import { useCollections, useCookLogs, useForks, useRecipe, useSettings } from '../../db/hooks';
import { deleteRecipe, forkRecipe, restoreRecipe } from '../../db/recipes';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { formatDate, formatMinutes, totalMinutes } from '../../lib/format';
import { AudioPlayer } from '../../ui/AudioPlayer';
import { Button, ButtonLink, ToolButton } from '../../ui/Button';
import { Chip } from '../../ui/Controls';
import { Icon } from '../../ui/Icon';
import { Photo } from '../../ui/Photo';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { IngredientControls, IngredientList } from './IngredientsPanel';
import { StepText } from './StepText';
import { useAdjustedIngredients } from './useAdjusted';
import { RecipeShareActions } from './RecipeShareActions';

function Meta({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const items = [
    recipe.prepMinutes ? [t.ui.recipe.prep, formatMinutes(recipe.prepMinutes)] : null,
    recipe.cookMinutes ? [t.ui.recipe.cook, formatMinutes(recipe.cookMinutes)] : null,
    recipe.prepMinutes && recipe.cookMinutes ? [t.ui.recipe.total, formatMinutes(totalMinutes(recipe))] : null,
    recipe.servings ? [t.ui.recipe.servings, String(recipe.servings)] : null,
  ].filter((x): x is [string, string] => x !== null);
  if (!items.length) return null;
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-ink-muted">{k}</dt>
          <dd className="font-display-soft text-lg font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function StoryCard({ recipe }: { recipe: Recipe }) {
  const t = useT();
  if (!recipe.story?.length) return null;
  return (
    <section aria-labelledby="story-h" className="rounded-xl bg-surface p-6 shadow-paper sm:p-8">
      <h2 id="story-h" className="mb-4 flex items-center gap-2 font-body text-base font-bold text-accent-text">
        <Icon name="quote" size={22} />
        {t.ui.recipe.story}
      </h2>
      <div className="flex flex-col gap-6">
        {recipe.story.map((s, i) => (
          <figure key={i} className="flex flex-col gap-3">
            <figcaption className="text-ink-muted">{s.prompt}</figcaption>
            <blockquote className="font-display-soft text-2xl leading-snug font-normal italic">“{s.answer}”</blockquote>
            {s.audioId && <AudioPlayer id={s.audioId} label={t.ui.recipe.voiceNote(i + 1)} />}
          </figure>
        ))}
      </div>
    </section>
  );
}

function InHerWords({ transcript }: { transcript: string }) {
  const t = useT();
  return (
    <Disclosure className="group rounded-xl border-2 border-line">
      <Heading>
        <AriaButton
          slot="trigger"
          className="flex min-h-16 w-full items-center gap-3 rounded-xl px-5 text-left outline-none data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)"
        >
          <Icon name="wave" className="text-accent-text" />
          <span className="flex-1">
            <span className="block font-display-soft text-xl">{t.ui.recipe.inHerWords}</span>
            <span className="block text-sm text-ink-muted">{t.ui.recipe.inHerWordsHint}</span>
          </span>
          <Icon name="chevronDown" className="transition-transform group-data-[expanded]:rotate-180" />
        </AriaButton>
      </Heading>
      <DisclosurePanel>
        <p
          className="px-5 pb-6 font-display-soft text-xl leading-[2.1rem] italic [font-variation-settings:'SOFT'_100,'WONK'_1]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent calc(2.1rem - 1px), var(--line) calc(2.1rem - 1px), var(--line) 2.1rem)',
            backgroundPosition: '0 0.35rem',
          }}
        >
          {transcript}
        </p>
      </DisclosurePanel>
    </Disclosure>
  );
}

function CollectionsEditor({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const collections = useCollections();
  if (!collections?.length) return null;
  return (
    <section aria-labelledby="col-h" className="flex flex-col gap-3">
      <h2 id="col-h" className="font-body text-base font-bold">
        {t.ui.recipe.collections}
      </h2>
      <div className="flex flex-wrap gap-2">
        {collections.map((c) => {
          const on = recipe.collectionIds.includes(c.id);
          return (
            <Chip
              key={c.id}
              isSelected={on}
              onPress={() =>
                setRecipeCollections(recipe.id, on ? recipe.collectionIds.filter((x) => x !== c.id) : [...recipe.collectionIds, c.id])
              }
            >
              {on && <Icon name="check" size={18} />}
              {c.name}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}

function CookLogList({ recipeId }: { recipeId: string }) {
  const t = useT();
  const logs = useCookLogs(recipeId);
  return (
    <section aria-labelledby="log-h" className="flex flex-col gap-3">
      <h2 id="log-h" className="text-xl">
        {t.ui.recipe.cookLog}
      </h2>
      {!logs?.length ? (
        <p className="text-ink-muted">{t.ui.recipe.noCooks}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {logs.map((l) => (
            <li key={l.id} className="flex gap-4 py-3">
              {l.photoId && <Photo id={l.photoId} alt="" className="size-20 shrink-0 rounded-md" />}
              <div>
                <p className="font-bold">
                  {formatDate(l.cookedAt)}
                  {l.rating ? (
                    <span className="ml-3 inline-flex items-center gap-0.5 text-accent-text" aria-label={t.ui.recipe.rating(l.rating)}>
                      {Array.from({ length: l.rating }, (_, i) => (
                        <Icon key={i} name="star" size={16} fill="currentColor" />
                      ))}
                    </span>
                  ) : null}
                </p>
                {l.note && <p className="text-ink-muted">{l.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Lineage({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const original = useRecipe(recipe.forkedFromId);
  const forks = useForks(recipe.id);
  if (!original && !forks?.length) return null;
  return (
    <section className="flex flex-col gap-2">
      {original && (
        <p>
          {t.ui.recipe.basedOn}{' '}
          <Link to={`/r/${original.id}`} className="font-bold text-accent-text underline underline-offset-4">
            {original.title}
          </Link>
        </p>
      )}
      {forks && forks.length > 0 && (
        <div>
          <h2 className="font-body text-base font-bold">{t.ui.recipe.versions}</h2>
          <ul className="mt-1 flex flex-col gap-1">
            {forks.map((f) => (
              <li key={f.id}>
                <Link to={`/r/${f.id}`} className="text-accent-text underline underline-offset-4">
                  {t.ui.recipe.versionBy(f.author || '…')}: {f.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CardPhotos({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  if (!recipe.originalCardPhotoIds.length) return null;
  return (
    <section aria-labelledby="card-h" className="flex flex-col gap-3">
      <h2 id="card-h" className="text-xl">
        {t.ui.recipe.originalCard}
      </h2>
      <div className="flex flex-wrap gap-3">
        {recipe.originalCardPhotoIds.map((id, i) => (
          <AriaButton
            key={id}
            onPress={() => setOpen(id)}
            aria-label={`${t.ui.recipe.originalCard} ${i + 1}`}
            className="overflow-hidden rounded-lg shadow-paper outline-none data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)"
          >
            <Photo id={id} alt="" className="h-48 w-40 -rotate-1" />
          </AriaButton>
        ))}
      </div>
      <Sheet isOpen={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={t.ui.recipe.originalCard} size="lg">
        {open && <Photo id={open} alt={t.ui.recipe.originalCard} className="w-full rounded-lg object-contain" />}
      </Sheet>
    </section>
  );
}

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const adj = useAdjustedIngredients(recipe);

  return (
    <article className="@container mx-auto flex w-full max-w-5xl flex-col gap-10 pb-16">
      <header className="flex flex-col gap-5">
        {recipe.photoIds[0] && (
          <Photo id={recipe.photoIds[0]} alt={recipe.title} className="aspect-[16/10] w-full rounded-xl shadow-paper" />
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl">{recipe.title}</h1>
          {recipe.author && <p className="font-display-soft text-xl text-ink-muted italic">{t.ui.common.fromKitchen(recipe.author)}</p>}
        </div>
        {recipe.description && <p className="max-w-[60ch] text-lg">{recipe.description}</p>}
        <Meta recipe={recipe} />
        {recipe.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t.ui.recipe.tags}>
            {recipe.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-sunk px-3 py-1 text-sm font-bold">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <div className="no-print flex flex-wrap items-center gap-2">
          <ButtonLink href={`/r/${recipe.id}/cook`} variant="primary" size="lg" icon="flame">
            {t.ui.recipe.startCooking}
          </ButtonLink>
          <ToolButton icon="edit" onPress={() => navigate(`/r/${recipe.id}/edit`)}>
            {t.ui.common.edit}
          </ToolButton>
          <ToolButton
            icon="cartAdd"
            onPress={async () => {
              await addToGrocery(adj.ingredients, recipe.id);
              toast.show({ message: t.ui.recipe.addedToGrocery(adj.ingredients.length), tone: 'success' });
            }}
          >
            {t.ui.recipe.addToGrocery}
          </ToolButton>
          <ToolButton
            icon="fork"
            onPress={async () => {
              const fork = await forkRecipe(recipe.id, settings.myName || recipe.author);
              toast.show({ message: t.ui.recipe.forked, tone: 'success' });
              navigate(`/r/${fork.id}/edit`);
            }}
          >
            {t.ui.recipe.makeMyVersion}
          </ToolButton>
          <RecipeShareActions recipe={recipe} />
        </div>
      </header>

      <StoryCard recipe={recipe} />

      <div className="grid gap-10 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="ing-h" className="flex flex-col gap-5 @3xl:sticky @3xl:top-0 @3xl:self-start">
          <h2 id="ing-h" className="text-2xl">
            {t.ui.recipe.ingredients}
          </h2>
          <IngredientControls {...adj} className="no-print" />
          <IngredientList ingredients={adj.ingredients} />
        </section>

        <section aria-labelledby="steps-h" className="flex flex-col gap-5">
          <h2 id="steps-h" className="text-2xl">
            {t.ui.recipe.method}
          </h2>
          {!recipe.steps.length && <p className="text-ink-muted">{t.ui.recipe.noSteps}</p>}
          <ol className="flex flex-col gap-7">
            {recipe.steps.map((s, i) => (
              <li key={s.id} className="print-avoid-break grid grid-cols-[2.5rem_1fr] gap-x-3">
                <span aria-hidden className="font-display-soft text-2xl leading-none font-semibold text-accent-text">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-3">
                  <p className="text-lg leading-relaxed">
                    <span className="sr-only">{t.ui.recipe.step(i + 1)}: </span>
                    <StepText text={s.text} ingredients={adj.ingredients} />
                  </p>
                  {s.photoId && <Photo id={s.photoId} alt="" className="aspect-[4/3] w-full max-w-md rounded-lg" />}
                </div>
              </li>
            ))}
          </ol>
          {recipe.tips && (
            <aside aria-labelledby="tips-h" className="mt-4 rounded-xl bg-accent-soft p-6">
              <h2 id="tips-h" className="mb-2 font-body text-base font-bold">
                {t.ui.recipe.tips}
              </h2>
              <p className="font-display-soft text-xl whitespace-pre-line italic">{recipe.tips}</p>
            </aside>
          )}
        </section>
      </div>

      {(recipe.voiceNoteIds.length > 0 || recipe.transcript) && (
        <section className="flex flex-col gap-4">
          {recipe.voiceNoteIds.length > 0 && (
            <>
              <h2 className="text-xl">{t.ui.recipe.voiceNotes}</h2>
              {recipe.voiceNoteIds.map((id, i) => (
                <AudioPlayer key={id} id={id} label={t.ui.recipe.voiceNote(i + 1)} />
              ))}
            </>
          )}
          {recipe.transcript && <InHerWords transcript={recipe.transcript} />}
        </section>
      )}

      <CardPhotos recipe={recipe} />
      <Lineage recipe={recipe} />
      <div className="no-print flex flex-col gap-10">
        <CookLogList recipeId={recipe.id} />
        <CollectionsEditor recipe={recipe} />
        {recipe.sourceUrl && (
          <p className="text-ink-muted">
            {t.ui.recipe.source}:{' '}
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-accent-text underline underline-offset-4">
              {new URL(recipe.sourceUrl).hostname}
            </a>
          </p>
        )}
        <div>
          <Button
            variant="danger"
            icon="trash"
            onPress={async () => {
              const snap = await deleteRecipe(recipe.id);
              navigate('/');
              if (snap) toast.undo(t.ui.recipe.deleted(recipe.title), () => restoreRecipe(snap));
            }}
          >
            {t.ui.recipe.deleteRecipe}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function RecipeDetailPage() {
  const t = useT();
  const { id } = useParams();
  const recipe = useRecipe(id);
  if (recipe === undefined) return <p className="p-6 text-ink-muted">{t.ui.common.loading}</p>;
  if (!recipe)
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <p className="font-display-soft text-2xl">{t.ui.common.recipeNotFound}</p>
        <ButtonLink href="/" variant="secondary" icon="book">
          {t.ui.common.goHome}
        </ButtonLink>
      </div>
    );
  return <RecipeView key={recipe.id} recipe={recipe} />;
}
