import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { ToolButton } from '../../ui/Button';

/** Share and print actions for a recipe. */
export function RecipeShareActions({ recipe: _recipe }: { recipe: Recipe }) {
  const t = useT();
  return (
    <ToolButton icon="print" onPress={() => window.print()}>
      {t.ui.recipe.print}
    </ToolButton>
  );
}
