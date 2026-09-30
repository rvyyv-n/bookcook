import { useMemo, useState, type ReactNode } from 'react';
import { Form, Link } from 'react-aria-components';
import { useNavigate, useParams } from 'react-router';
import { addCollection, deleteCollection, renameCollection, restoreCollection, setCollectionIcon } from '../../db/collections';
import { useCollections, useRecipes } from '../../db/hooks';
import type { Collection, Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { TextField } from '../../ui/Field';
import { Icon } from '../../ui/Icon';
import { IconMenu } from '../../ui/Menu';
import { Photo } from '../../ui/Photo';
import { useToast } from '../../ui/Toast';
import { TopicIcon, type TopicIconName } from '../../ui/TopicIcon';
import { cardGridClass, RecipeCard } from './RecipeCard';
import { useStagger } from '../../ui/motion';
import { topicIcon } from './topics';

function PageTitle({ title, count, action }: { title: string; count?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2 pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl leading-none tracking-[-0.02em]">{title}</h1>
        {count && <p className="text-ink-muted">{count}</p>}
      </div>
      {action}
    </header>
  );
}

const tileGridClass = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3.5';

/** A collection or tag: its icon, name and count, and the first few recipes in it. */
function TopicTile({
  index,
  href,
  icon,
  name,
  count,
  recipes,
}: {
  href: string;
  icon: TopicIconName;
  name: string;
  count: string;
  recipes: Recipe[];
  index: number;
}) {
  const rise = useStagger(`tile:${href}`, index);
  return (
    <li className={cx('min-w-0', rise.className)} style={rise.style}>
      <Link
        href={href}
        className="group flex h-full flex-col gap-3.5 rounded-lg bg-surface p-4.5 text-ink no-underline shadow-paper transition-transform duration-(--dur) ease-(--ease-out) data-[hovered]:-translate-y-0.5"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
            <TopicIcon name={icon} />
          </span>
          <Icon name="chevron" className="mt-3 shrink-0 text-ink-muted" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="type-display text-xl leading-[1.15]">{name}</span>
          <span className="text-ink-muted">{count}</span>
        </span>
        {recipes.length > 0 && (
          <span className="mt-auto flex gap-1.5" aria-hidden>
            {recipes.slice(0, 4).map((r) => (
              <Photo key={r.id} id={r.photoIds[0]} alt="" className="size-12 rounded-sm" />
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}

function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  const t = useT();
  const titles = useRecipes();
  const byId = useMemo(() => new Map(titles?.map((r) => [r.id, r.title])), [titles]);
  if (!recipes.length) return <p className="py-6 text-lg text-ink-muted">{t.ui.library.emptyFilter}</p>;
  return (
    <ul className={cx(cardGridClass, 'pb-8')} aria-label={t.ui.library.recipes}>
      {recipes.map((r, i) => (
        <RecipeCard key={r.id} index={i} recipe={r} parentTitle={r.forkedFromId ? byId.get(r.forkedFromId) : undefined} />
      ))}
    </ul>
  );
}

/** Recipes that aren't in any collection, or have no tags, so the page shows what's left to sort. */
function Unsorted({ title, hint, recipes }: { title: string; hint?: string; recipes: Recipe[] }) {
  if (!recipes.length) return null;
  return (
    <section aria-labelledby="unsorted-h" className="flex flex-col gap-3.5 pt-10">
      <div className="flex flex-col gap-1">
        <h2 id="unsorted-h" className="type-heading text-xl">
          {title}
        </h2>
        {hint && <p className="text-ink-muted">{hint}</p>}
      </div>
      <RecipeGrid recipes={recipes} />
    </section>
  );
}

const byTitle = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title);

/** Edit mode: the icon, the name (saved when you leave the field or press Enter) and Delete. */
function CollectionEditRow({ collection }: { collection: Collection }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(collection.name);
  const save = () => {
    const n = name.trim();
    if (n && n !== collection.name) void renameCollection(collection.id, n);
    else setName(collection.name);
  };
  return (
    <li className="flex items-center gap-3 border-b border-line py-3">
      <IconMenu
        label={t.ui.library.collectionIcon(collection.name)}
        value={topicIcon(collection.name, collection.icon)}
        onChange={(icon) => setCollectionIcon(collection.id, icon)}
        names={t.ui.library.topics}
      />
      <TextField
        label={t.ui.library.renameCollection(collection.name)}
        labelHidden
        dictate={false}
        value={name}
        onChange={setName}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="min-w-0 flex-1"
      />
      <Button
        variant="quiet"
        aria-label={t.ui.library.deleteNamed(collection.name)}
        onPress={async () => {
          const snap = await deleteCollection(collection.id);
          if (snap) toast.undo(t.ui.library.collectionDeleted(collection.name), () => restoreCollection(snap));
        }}
      >
        {t.ui.common.delete}
      </Button>
    </li>
  );
}

export function CollectionsPage() {
  const t = useT();
  const toast = useToast();
  const collections = useCollections();
  const recipes = useRecipes();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  if (!collections || !recipes) return null;
  const inCollection = (id: string) => recipes.filter((r) => r.collectionIds.includes(id)).sort(byTitle);
  return (
    <div className="flex flex-col">
      <PageTitle
        title={t.ui.nav.collections}
        action={
          collections.length > 0 && (
            <Button variant="secondary" icon={editing ? 'check' : 'edit'} onPress={() => setEditing(!editing)}>
              {editing ? t.ui.library.doneEditing : t.ui.library.editCollections}
            </Button>
          )
        }
      />
      {!collections.length ? (
        <p className="max-w-2xl text-lg text-ink-muted">{t.ui.library.noCollections}</p>
      ) : editing ? (
        <ul className="flex max-w-2xl flex-col border-t border-line">
          {collections.map((c) => (
            <CollectionEditRow key={c.id} collection={c} />
          ))}
        </ul>
      ) : (
        <ul className={tileGridClass}>
          {collections.map((c, i) => {
            const list = inCollection(c.id);
            return (
              <TopicTile
                key={c.id}
                index={i}
                href={`/c/${c.id}`}
                icon={topicIcon(c.name, c.icon)}
                name={c.name}
                count={t.ui.library.count(list.length)}
                recipes={list}
              />
            );
          })}
        </ul>
      )}
      <Form
        className="flex max-w-2xl flex-wrap items-end gap-2.5 pt-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          await addCollection(n);
          setName('');
          toast.show({ message: t.ui.library.collectionAdded(n), tone: 'success' });
        }}
      >
        <TextField label={t.ui.library.newCollection} value={name} onChange={setName} className="min-w-60 flex-1" />
        <Button type="submit" variant="secondary" icon="add">
          {t.ui.common.add}
        </Button>
      </Form>
      {!editing && <Unsorted title={t.ui.library.notInCollection} recipes={recipes.filter((r) => !r.collectionIds.length).sort(byTitle)} />}
    </div>
  );
}

export function CollectionPage() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const collections = useCollections();
  const recipes = useRecipes();
  if (!collections || !recipes) return null;
  const collection = collections.find((c) => c.id === id);
  if (!collection) return <p className="py-10 text-lg">{t.ui.library.collectionMissing}</p>;
  const list = recipes.filter((r) => r.collectionIds.includes(collection.id)).sort(byTitle);
  return (
    <div className="flex flex-col">
      <PageTitle title={collection.name} count={t.ui.library.count(list.length)} />
      <RecipeGrid recipes={list} />
      <Button
        variant="destructive"
        className="self-start"
        onPress={async () => {
          const snap = await deleteCollection(collection.id);
          navigate('/c');
          if (snap) toast.undo(t.ui.library.collectionDeleted(collection.name), () => restoreCollection(snap));
        }}
      >
        {t.ui.library.deleteCollection}
      </Button>
    </div>
  );
}

export function TagsPage() {
  const t = useT();
  const recipes = useRecipes();
  const tags = useMemo(() => {
    const m = new Map<string, Recipe[]>();
    for (const r of recipes ?? []) for (const tag of r.tags) m.set(tag, [...(m.get(tag) ?? []), r]);
    return [...m].sort(([a], [b]) => a.localeCompare(b));
  }, [recipes]);
  if (!recipes) return null;
  return (
    <div className="flex flex-col">
      <PageTitle title={t.ui.nav.tags} />
      {tags.length ? (
        <ul className={tileGridClass}>
          {tags.map(([tag, list], i) => (
            <TopicTile
              key={tag}
              index={i}
              href={`/t/${encodeURIComponent(tag)}`}
              icon={topicIcon(tag)}
              name={tag}
              count={t.ui.library.count(list.length)}
              recipes={[...list].sort(byTitle)}
            />
          ))}
        </ul>
      ) : (
        <p className="max-w-2xl text-lg text-ink-muted">{t.ui.library.noTags}</p>
      )}
      <Unsorted
        title={t.ui.library.notTagged}
        hint={t.ui.library.notTaggedHint}
        recipes={recipes.filter((r) => !r.tags.length).sort(byTitle)}
      />
    </div>
  );
}

export function TagPage() {
  const t = useT();
  const { tag = '' } = useParams();
  const recipes = useRecipes();
  if (!recipes) return null;
  const list = recipes.filter((r) => r.tags.includes(tag)).sort(byTitle);
  return (
    <div className="flex flex-col">
      <PageTitle title={tag} count={t.ui.library.count(list.length)} />
      <RecipeGrid recipes={list} />
    </div>
  );
}
