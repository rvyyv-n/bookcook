import { useMemo, useState } from 'react';
import { useSettings } from '../../db/hooks';
import type { Ingredient, Recipe } from '../../db/types';
import { convertIngredient, dominantSystem, type MeasureSystem } from '../../lib/parse/convert';
import { scaleIngredients } from '../../lib/parse/scale';

/** Servings and unit system for a recipe, with the adjusted ingredient list. */
export function useAdjustedIngredients(recipe: Recipe | undefined) {
  const settings = useSettings();
  const [servingsState, setServings] = useState<number | null>(null);
  const [systemState, setSystem] = useState<MeasureSystem | null>(null);

  const base = recipe?.servings;
  const servings = servingsState ?? base ?? 0;
  const system: MeasureSystem =
    systemState ?? (settings.measureSystem === 'auto' ? dominantSystem(recipe?.ingredients ?? []) : settings.measureSystem);
  const natural = recipe ? dominantSystem(recipe.ingredients) : 'metric';

  const ingredients: Ingredient[] = useMemo(() => {
    if (!recipe) return [];
    let list = recipe.ingredients;
    if (base && servings && servings !== base) list = scaleIngredients(list, base, servings);
    // Only convert when the reader asks for the other system; otherwise show what was written.
    if (system !== natural) list = list.map((i) => convertIngredient(i, system));
    return list;
  }, [recipe, base, servings, system, natural]);

  return {
    ingredients,
    servings,
    setServings,
    system,
    setSystem,
    canScale: !!base,
    factor: base && servings ? servings / base : 1,
  };
}
