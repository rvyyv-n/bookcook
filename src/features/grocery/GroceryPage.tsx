import { useMemo, useState } from 'react';
import { Form } from 'react-aria-components';
import { addManualItem, clearChecked, restoreGroceryItems, setChecked } from '../../db/grocery';
import { useGrocery, useRecipes } from '../../db/hooks';
import type { GroceryItem } from '../../db/types';
import { useT } from '../../i18n';
import { formatIngredient } from '../../lib/parse/ingredient';
import { Button } from '../../ui/Button';
import { CheckItem } from '../../ui/Controls';
import { TextField } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { groupByAisle } from './aisles';

/** "3 onions" over "From Biryani, Karahi" (or "Added by you"). */
function Item({ item, titles }: { item: GroceryItem; titles: Map<string, string> }) {
  const t = useT();
  const from = item.fromRecipeIds.map((id) => titles.get(id)).filter((x): x is string => !!x);
  const origin = from.length ? t.ui.grocery.from(from) : item.fromRecipeIds.length ? undefined : t.ui.grocery.addedByYou;
  return (
    <li>
      <CheckItem isSelected={item.checked} onChange={(on) => setChecked(item.id, on)}>
        <b className="block">{formatIngredient(item)}</b>
        {/* inline-block keeps the check's strikethrough off this line, as in the mock. */}
        {origin && <span className="inline-block text-[1rem] text-ink-muted">{origin}</span>}
      </CheckItem>
    </li>
  );
}

function AddItem() {
  const t = useT();
  const [text, setText] = useState('');
  return (
    <Form
      className="flex flex-wrap items-end gap-2 desk:max-w-[38.75rem]"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await addManualItem(text);
        setText('');
      }}
    >
      <TextField
        label={t.ui.grocery.addItem}
        labelHidden
        placeholder={t.ui.grocery.addItem}
        value={text}
        onChange={setText}
        className="min-w-[min(100%,13rem)] flex-1"
      />
      <Button type="submit" variant="primary" className="px-[1.1rem]">
        {t.ui.grocery.add}
      </Button>
    </Form>
  );
}

export function GroceryPage() {
  const t = useT();
  const toast = useToast();
  const items = useGrocery();
  const recipes = useRecipes();
  const titles = useMemo(() => new Map(recipes?.map((r) => [r.id, r.title])), [recipes]);
  const groups = useMemo(() => groupByAisle(items ?? []), [items]);
  if (!items) return null;
  const inBasket = items.filter((i) => i.checked).length;

  return (
    <div className="flex flex-col gap-4.5 desk:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-2">
        {/* The count wraps beside Clear checked; at Large and Huge the button drops below. */}
        <div className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 desk:flex-row desk:items-end desk:gap-4">
          <h1 className="text-3xl leading-none tracking-[-0.02em]">{t.ui.grocery.title}</h1>
          <p className="text-ink-muted" aria-live="polite">
            {t.ui.grocery.count(items.length - inBasket, inBasket)}
          </p>
        </div>
        {inBasket > 0 && (
          <Button
            variant="secondary"
            icon="clearChecked"
            className="shrink-0"
            onPress={async () => {
              const cleared = await clearChecked();
              toast.undo(t.ui.grocery.cleared(cleared.length), () => restoreGroceryItems(cleared));
            }}
          >
            {t.ui.grocery.clearChecked}
          </Button>
        )}
      </header>
      <AddItem />
      {!items.length ? (
        <div className="flex flex-col gap-3 px-2 py-12">
          <h2 className="text-2xl leading-[1.1]">{t.ui.grocery.emptyTitle}</h2>
          <p className="text-ink-muted">{t.ui.grocery.emptyBody}</p>
        </div>
      ) : (
        <div className="grid items-start gap-x-8 gap-y-4.5 pt-1 desk:grid-cols-[repeat(auto-fill,minmax(14.375rem,1fr))] desk:gap-y-1">
          {groups.map((g, gi) => (
            <section key={g.aisle} aria-labelledby={`aisle-${gi}`} className="flex flex-col desk:pb-4.5">
              <h2 id={`aisle-${gi}`} className="type-heading mb-1 text-lg">
                {t.ui.grocery.aisles[g.aisle]}
              </h2>
              <ul className="flex flex-col">
                {g.items.map((item) => (
                  <Item key={item.id} item={item} titles={titles} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
