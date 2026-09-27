import { useMemo, useState } from 'react';
import { Form, Link } from 'react-aria-components';
import { useNavigate, useParams } from 'react-router';
import { addCollection, deleteCollection, restoreCollection } from '../../db/collections';
import { useCollections, useRecipes } from '../../db/hooks';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { TextField } from '../../ui/Field';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import { cardGridClass, RecipeCard } from './RecipeCard';

function PageTitle({ title, count }: { title: string; count?: string }) {
  return (
    <header className="flex flex-col gap-1 pt-2 pb-5">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{title}</h1>
      {count && <p className="text-ink-muted">{count}</p>}
    </header>
  );
}

/** One 64px row per collection or tag: the name, how many recipes, and a chevron. */
function IndexRow({ href, name, count }: { href: string; name: string; count: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 border-b border-line px-1 text-ink no-underline data-[hovered]:bg-sunk">
        <span className="type-display flex-1 text-lg">{name}</span>
        <span className="text-ink-muted">{count}</span>
        <Icon name="chevron" className="shrink-0 text-ink-muted" />
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
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} parentTitle={r.forkedFromId ? byId.get(r.forkedFromId) : undefined} />
      ))}
    </ul>
  );
}

const byTitle = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title);

export function CollectionsPage() {
  const t = useT();
  const toast = useToast();
  const collections = useCollections();
  const recipes = useRecipes();
  const [name, setName] = useState('');
  if (!collections || !recipes) return null;
  const count = (id: string) => t.ui.library.count(recipes.filter((r) => r.collectionIds.includes(id)).length);
  return (
    <div className="flex max-w-2xl flex-col">
      <PageTitle title={t.ui.nav.collections} />
      {collections.length ? (
        <ul className="flex flex-col border-t border-line">
          {collections.map((c) => (
            <IndexRow key={c.id} href={`/c/${c.id}`} name={c.name} count={count(c.id)} />
          ))}
        </ul>
      ) : (
        <p className="text-lg text-ink-muted">{t.ui.library.noCollections}</p>
      )}
      <Form
        className="flex flex-wrap items-end gap-2.5 pt-8"
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
        <Button type="submit" variant="secondary" icon="add" className="min-h-16">
          {t.ui.common.add}
        </Button>
      </Form>
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
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recipes ?? []) for (const tag of r.tags) m.set(tag, (m.get(tag) ?? 0) + 1);
    return [...m].sort(([a], [b]) => a.localeCompare(b));
  }, [recipes]);
  if (!recipes) return null;
  return (
    <div className="flex max-w-2xl flex-col">
      <PageTitle title={t.ui.nav.tags} />
      {counts.length ? (
        <ul className="flex flex-col border-t border-line">
          {counts.map(([tag, n]) => (
            <IndexRow key={tag} href={`/t/${encodeURIComponent(tag)}`} name={tag} count={t.ui.library.count(n)} />
          ))}
        </ul>
      ) : (
        <p className="text-lg text-ink-muted">{t.ui.library.noTags}</p>
      )}
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
