import type { Ingredient } from '../../db/types';
import { useT } from '../../i18n';
import type { MeasureSystem } from '../../lib/parse/convert';
import { ingredientParts } from '../../lib/parse/ingredient';
import { getUnit } from '../../lib/parse/units';
import { CheckItem, Segmented, Stepper } from '../../ui/Controls';
import { cx } from '../../ui/cx';

export function IngredientLine({ ingredient }: { ingredient: Ingredient }) {
  const p = ingredientParts(ingredient);
  const unit = getUnit(ingredient.unit);
  const amount = [p.quantity, p.unit].filter(Boolean).join(' ') + (unit?.vague && !unit.trailing && p.quantity ? ' of' : '');
  return (
    <span>
      {amount && <strong className="font-bold">{amount} </strong>}
      {p.name}
      {p.note && <span className="text-ink-muted">, {p.note}</span>}
    </span>
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

export function IngredientControls({
  servings,
  setServings,
  canScale,
  system,
  setSystem,
  className,
}: {
  servings: number;
  setServings: (n: number) => void;
  canScale: boolean;
  system: MeasureSystem;
  setSystem: (s: MeasureSystem) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cx('flex flex-wrap items-end gap-x-6 gap-y-4', className)}>
      {canScale && (
        <Stepper
          label={t.ui.recipe.servings}
          value={servings}
          onChange={setServings}
          decrementLabel={t.ui.recipe.fewerServings}
          incrementLabel={t.ui.recipe.moreServings}
        />
      )}
      <Segmented<MeasureSystem>
        label={t.ui.recipe.units}
        value={system}
        onChange={setSystem}
        className="min-w-60 flex-1"
        options={[
          { id: 'metric', label: t.ui.recipe.metric },
          { id: 'imperial', label: t.ui.recipe.imperial },
        ]}
      />
    </div>
  );
}

/** The ingredient list, grouped by section. Optionally a checklist (cook mode). */
export function IngredientList({
  ingredients,
  checked,
  onToggle,
  large = false,
}: {
  ingredients: Ingredient[];
  checked?: Set<string>;
  onToggle?: (id: string, on: boolean) => void;
  large?: boolean;
}) {
  const t = useT();
  if (!ingredients.length) return <p className="text-ink-muted">{t.ui.recipe.noIngredients}</p>;
  return (
    <div className="flex flex-col gap-5">
      {groupBySection(ingredients).map((g, gi) => (
        <section key={gi} aria-label={g.section}>
          {g.section && <h3 className="mb-1 type-display text-lg text-ink-muted italic">{g.section}</h3>}
          <ul className={cx('flex flex-col', !onToggle && 'divide-y divide-line')}>
            {g.items.map((i) =>
              onToggle ? (
                <li key={i.id}>
                  <CheckItem
                    isSelected={checked?.has(i.id) ?? false}
                    onChange={(on) => onToggle(i.id, on)}
                    className={large ? 'text-lg' : undefined}
                  >
                    <IngredientLine ingredient={i} />
                  </CheckItem>
                </li>
              ) : (
                <li key={i.id} className={cx('py-2.5', large && 'text-lg')}>
                  <IngredientLine ingredient={i} />
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
