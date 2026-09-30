import { useMemo, useState, type ReactNode } from 'react';
import { Form } from 'react-aria-components';
import { addManualItem, clearChecked, restoreGroceryItems, setChecked } from '../../db/grocery';
import { useGrocery, useRecipes } from '../../db/hooks';
import type { GroceryItem } from '../../db/types';
import { useT } from '../../i18n';
import { formatIngredient } from '../../lib/parse/ingredient';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { prefersReducedMotion, useFlip, useStagger } from '../../ui/motion';
import { Icon, type IconName } from '../../ui/Icon';
import { TopicIcon, type TopicIconName } from '../../ui/TopicIcon';
import type { Aisle } from '../../lib/parse/aisles';
import { CheckItem, Struck } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { TextField } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { groupByAisle } from './aisles';

/** A small icon for each aisle, from the same set as collections and tags. */
const AISLE_ICONS: Record<Aisle, TopicIconName> = {
  Produce: 'carrot',
  'Meat & fish': 'beef',
  'Dairy & eggs': 'egg',
  Bakery: 'croissant',
  'Spices & seasonings': 'flame',
  Pantry: 'wheat',
  Frozen: 'iceCream',
  Drinks: 'coffee',
  Other: 'utensils',
};

/** Fade 150ms then collapse 200ms (motion.css: --dur-exit, --dur). */
const LEAVE_MS = 350;

/** Where an item came from: "From Biryani, Karahi", "Added by you", or nothing if its recipe is gone. */
function useOrigin() {
  const t = useT();
  const recipes = useRecipes();
  const titles = useMemo(() => new Map(recipes?.map((r) => [r.id, r.title])), [recipes]);
  return (item: GroceryItem) => {
    const from = item.fromRecipeIds.map((id) => titles.get(id)).filter((x): x is string => !!x);
    return {
      titles: from,
      label: from.length ? t.ui.grocery.from(from) : item.fromRecipeIds.length ? undefined : t.ui.grocery.addedByYou,
    };
  };
}

/** "3 onions" over where it came from, unless the whole list came from the same place. */
function Item({
  item,
  origin,
  leaving,
  entering,
}: {
  item: GroceryItem;
  origin?: string;
  /** Being cleared: fades out, then the rows below close up. */
  leaving: boolean;
  /** Just put back by Undo: opens up and fades in. */
  entering: boolean;
}) {
  return (
    <li
      className={cx('grid grid-rows-[1fr]', leaving && 'grid-rows-[0fr] opacity-0', entering && 'animate-row-in')}
      style={
        leaving
          ? { transition: 'opacity var(--dur-exit) var(--ease-in), grid-template-rows var(--dur) var(--ease-out) var(--dur-exit)' }
          : undefined
      }
    >
      <div className="min-h-0 overflow-hidden">
        <CheckItem isSelected={item.checked} onChange={(on) => setChecked(item.id, on)}>
          {/* The origin sits outside Struck, so the line stays off it, as in the mock. */}
          <b className="block">
            <Struck>{formatIngredient(item)}</Struck>
          </b>
          {origin && <span className="inline-block text-[1rem] text-ink-muted">{origin}</span>}
        </CheckItem>
      </div>
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
      <Button type="submit" variant="primary" className="self-stretch px-[1.1rem]">
        {t.ui.grocery.add}
      </Button>
    </Form>
  );
}

/** An aisle of the list: it rises in with the others the first time the list is shown. */
function AisleSection({ aisle, index, children }: { aisle: Aisle; index: number; children: ReactNode }) {
  const rise = useStagger(`aisle:${aisle}`, index);
  return (
    <section
      data-flip={aisle}
      aria-labelledby={`aisle-${index}`}
      className={cx('flex flex-col desk:pb-4.5', rise.className)}
      style={rise.style}
    >
      {children}
    </section>
  );
}

/** One line of the sample list: a box (ticked or not), the item, and where it came from. */
function SampleItem({ ticked, children, from }: { ticked?: boolean; children: string; from?: string }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
      <span
        className={cx(
          'grid size-6 shrink-0 place-items-center rounded-[7px]',
          ticked ? 'bg-success text-paper' : 'shadow-[inset_0_0_0_2px_var(--line-control)]',
        )}
      >
        {ticked && <Icon name="check" size={18} current />}
      </span>
      <span className="flex min-w-0 flex-col leading-[1.25]">
        <b className={cx(ticked && 'text-ink-muted line-through decoration-2')}>{children}</b>
        {from && <span className="text-[0.875rem] text-ink-muted">{from}</span>}
      </span>
    </li>
  );
}

const EMPTY_ICONS: IconName[] = ['cookbook', 'addToGrocery', 'check'];

/** Nothing on the list: a sample list by aisle, the question, how it fills, and a way to the cookbook. */
function EmptyGrocery() {
  const tg = useT().ui.grocery;
  const items = tg.emptySampleItems;
  return (
    <EmptyState
      id="grocery-empty"
      sampleLabel={tg.emptySample}
      sample={
        <div className="flex flex-col gap-3">
          {(
            [
              ['Produce', [items.onions, items.coriander]],
              ['Dairy & eggs', [items.yogurt]],
            ] as const
          ).map(([aisle, list]) => (
            <div key={aisle} className="flex flex-col">
              <p className="type-heading flex items-center gap-2 text-lg">
                <TopicIcon name={AISLE_ICONS[aisle]} size="1.1rem" className="shrink-0 text-ink-muted" />
                {tg.aisles[aisle]}
              </p>
              <ul className="flex flex-col">
                {list.map((item, i) => (
                  <SampleItem key={item} ticked={aisle === 'Produce' && i === 0} from={tg.emptySampleFrom}>
                    {item}
                  </SampleItem>
                ))}
              </ul>
            </div>
          ))}
        </div>
      }
      eyebrow={tg.emptyEyebrow}
      title={tg.emptyTitle}
      steps={tg.emptySteps.map((step, i) => ({ icon: EMPTY_ICONS[i]!, ...step }))}
      action={
        <ButtonLink href="/" variant="secondary" icon="cookbook" className="w-full desk:w-auto desk:self-start">
          {tg.browse}
        </ButtonLink>
      }
    />
  );
}

export function GroceryPage() {
  const t = useT();
  const toast = useToast();
  const items = useGrocery();
  const originOf = useOrigin();
  const groups = useMemo(() => groupByAisle(items ?? []), [items]);
  const [clearing, setClearing] = useState<ReadonlySet<string>>(new Set());
  const [restored, setRestored] = useState<ReadonlySet<string>>(new Set());
  // Settle: when an aisle empties or a new one starts, the aisles around it glide into place.
  const aisles = useFlip<HTMLDivElement>();
  if (!items) return null;
  const inBasket = items.filter((i) => i.checked).length;
  const origins = items.map(originOf);
  // Everything from one recipe (or all typed in): say it once in the header, not on every row.
  const shared = origins.every((o) => o.label === origins[0]?.label) ? origins[0] : undefined;

  return (
    <div className="flex flex-col gap-4.5 desk:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-2">
        {/* The count wraps beside Clear checked; at Large and Huge the button drops below. */}
        <div className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 desk:flex-row desk:items-end desk:gap-4">
          <h1 className="text-3xl leading-none tracking-[-0.02em]">{t.ui.grocery.title}</h1>
          <p className="text-ink-muted" aria-live="polite">
            {t.ui.grocery.count(items.length - inBasket, inBasket)}
            {shared?.titles.length ? ` · ${t.ui.grocery.allFrom(shared.titles)}` : ''}
          </p>
        </div>
        {inBasket > 0 && (
          <Button
            variant="secondary"
            icon="clearChecked"
            className="shrink-0"
            onPress={async () => {
              // The rows fade out and close up before they're removed (at once if motion is reduced).
              if (!prefersReducedMotion()) {
                setClearing(new Set(items.filter((i) => i.checked).map((i) => i.id)));
                await new Promise((done) => setTimeout(done, LEAVE_MS));
              }
              const cleared = await clearChecked();
              setClearing(new Set());
              toast.undo(t.ui.grocery.cleared(cleared.length), async () => {
                setRestored(new Set(cleared.map((i) => i.id)));
                await restoreGroceryItems(cleared);
                setTimeout(() => setRestored(new Set()), 400);
              });
            }}
          >
            {t.ui.grocery.clearChecked}
          </Button>
        )}
      </header>
      <AddItem />
      {!items.length ? (
        <EmptyGrocery />
      ) : (
        <div
          ref={aisles}
          className="grid items-start gap-x-8 gap-y-4.5 pt-1 desk:grid-cols-[repeat(auto-fill,minmax(14.375rem,1fr))] desk:gap-y-1"
        >
          {groups.map((g, gi) => (
            <AisleSection key={g.aisle} aisle={g.aisle} index={gi}>
              <h2 id={`aisle-${gi}`} className="type-heading mb-1 flex items-center gap-2 text-lg">
                <TopicIcon name={AISLE_ICONS[g.aisle]} size="1.25rem" className="shrink-0 text-ink-muted" />
                {t.ui.grocery.aisles[g.aisle]}
              </h2>
              <ul className="flex flex-col">
                {g.items.map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    origin={shared ? undefined : originOf(item).label}
                    leaving={clearing.has(item.id)}
                    entering={restored.has(item.id)}
                  />
                ))}
              </ul>
            </AisleSection>
          ))}
        </div>
      )}
    </div>
  );
}
