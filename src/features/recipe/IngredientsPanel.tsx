import { spiceGroups } from '../../design/skin';
import type { Ingredient } from '../../db/types';
import { useT } from '../../i18n';
import type { MeasureSystem } from '../../lib/parse/convert';
import { ingredientParts } from '../../lib/parse/ingredient';
import { getUnit } from '../../lib/parse/units';
import { CheckItem, Segmented, Stepper } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { Rolling } from '../../ui/Rolling';

/** "1 kg", "a pinch of", "to taste". Empty when there's no amount. */
function amountOf(ingredient: Ingredient): string {
  const p = ingredientParts(ingredient);
  const unit = getUnit(ingredient.unit);
  return [p.quantity, p.unit].filter(Boolean).join(' ') + (unit?.vague && !unit.trailing && p.quantity ? ' of' : '');
}

export function IngredientLine({ ingredient }: { ingredient: Ingredient }) {
  const p = ingredientParts(ingredient);
  const amount = amountOf(ingredient);
  return (
    <span>
      {amount && (
        <strong className="font-bold">
          <Rolling value={amount}>{amount}</Rolling>{' '}
        </strong>
      )}
      {p.name}
      {p.note && <span className="text-ink-muted">, {p.note}</span>}
    </span>
  );
}

/**
 * "1 kg | chicken, bone-in": the amount in its own column. The column drops the "of" ("a handful | mint
 * leaves") and takes trailing amounts ("to taste | salt") so it never sits empty when there is one.
 */
function IngredientRow({ ingredient, dense }: { ingredient: Ingredient; dense: boolean }) {
  const p = ingredientParts(ingredient);
  const unit = getUnit(ingredient.unit);
  const amount = unit?.trailing ? unit.singular : [p.quantity, p.unit].filter(Boolean).join(' ');
  const note = unit?.trailing ? ingredient.note : p.note;
  return (
    <li className={cx('grid grid-cols-[minmax(0,5.2rem)_minmax(0,1fr)] gap-3 border-b border-line', dense ? 'py-1.5' : 'py-2.25')}>
      <b>
        <Rolling value={amount}>{amount}</Rolling>
      </b>
      <span>
        {p.name}
        {note && <span className="text-ink-muted">, {note}</span>}
      </span>
    </li>
  );
}

function groupBySection(list: Ingredient[]): { section?: string; items: Ingredient[] }[] {
  const groups: { section?: string; items: Ingredient[] }[] = [];
  for (const i of list) {
    const last = groups.at(-1);
    if (last && last.section === i.section) last.items.push(i);
    else groups.push({ section: i.section, items: [i] });
  }
  return groups;
}

/** The servings stepper and Metric / Imperial. */
export function IngredientControls({
  servings,
  setServings,
  canScale,
  system,
  setSystem,
  showUnits = true,
  className,
}: {
  servings: number;
  setServings: (n: number) => void;
  canScale: boolean;
  system: MeasureSystem;
  setSystem: (s: MeasureSystem) => void;
  showUnits?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cx('flex flex-wrap gap-2.5', className)}>
      {canScale && (
        <Stepper
          label={t.ui.recipe.servings}
          value={servings}
          onChange={setServings}
          format={t.ui.recipe.servingsCount}
          decrementLabel={t.ui.recipe.fewerServings}
          incrementLabel={t.ui.recipe.moreServings}
        />
      )}
      {showUnits && (
        <Segmented<MeasureSystem>
          label={t.ui.recipe.units}
          labelHidden
          value={system}
          onChange={setSystem}
          options={[
            { id: 'metric', label: t.ui.recipe.metric },
            { id: 'imperial', label: t.ui.recipe.imperial },
          ]}
        />
      )}
    </div>
  );
}

/**
 * The ingredient list, grouped by section. Each section gets a spice group, so with ingredient colours
 * on its heading shows a dot and hairline (or coloured text in the Tin skins). Optionally a checklist.
 */
export function IngredientList({
  ingredients,
  checked,
  onToggle,
  dense = false,
}: {
  ingredients: Ingredient[];
  checked?: Set<string>;
  onToggle?: (id: string, on: boolean) => void;
  /** Tighter rows and smaller headings (desktop detail). */
  dense?: boolean;
}) {
  const t = useT();
  if (!ingredients.length) return <p className="text-ink-muted">{t.ui.recipe.noIngredients}</p>;
  const groups = groupBySection(ingredients);
  const spice = spiceGroups(groups.map((g) => g.section));
  return (
    <div className="flex flex-col">
      {groups.map((g, gi) => (
        <section key={gi} aria-label={g.section} data-spice-group={g.section ? spice.get(g.section) : undefined} className="flex flex-col">
          {g.section && (
            <h3
              className={cx(
                'flex items-center gap-2.5 font-bold text-(--sp-heading)',
                dense ? 'pt-2 pb-0.5 text-base' : 'pt-3 pb-1 text-lg',
              )}
            >
              <span aria-hidden className={cx('shrink-0 rounded-full bg-(--sp) [display:var(--sp-show)]', dense ? 'size-2.5' : 'size-3')} />
              {g.section}
              <span aria-hidden className="h-px flex-1 bg-(--sp) [display:var(--sp-rule)]" />
            </h3>
          )}
          <ul className="flex flex-col">
            {g.items.map((i) =>
              onToggle ? (
                <li key={i.id}>
                  <CheckItem isSelected={checked?.has(i.id) ?? false} onChange={(on) => onToggle(i.id, on)}>
                    <IngredientLine ingredient={i} />
                  </CheckItem>
                </li>
              ) : (
                <IngredientRow key={i.id} ingredient={i} dense={dense} />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
