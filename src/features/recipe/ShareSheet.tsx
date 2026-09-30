import { useEffect, useState } from 'react';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import type { ShareResult } from '../../lib/platform/share';
import { RowButton } from '../../ui/Rows';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { copyRecipeLink, recipePhotoFile, shareRecipe, shareRecipeAsText } from './share';

/**
 * Share: a Bookcook link (they add it in one tap), the whole recipe as text with its photo (anyone
 * can read it), or the link copied. The photo is read as the sheet opens, so the share sheet can
 * still open straight from the tap, as Safari requires.
 */
export function ShareSheet({
  recipe,
  requestId,
  isOpen,
  onOpenChange,
}: {
  recipe: Recipe;
  requestId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const ts = t.ui.recipe.shareSheet;
  const toast = useToast();
  const [photo, setPhoto] = useState<File | undefined>();
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    void recipePhotoFile(recipe).then((f) => live && setPhoto(f));
    return () => {
      live = false;
    };
  }, [isOpen, recipe]);

  const done = (result: ShareResult, copied: string = t.ui.recipe.copied) => {
    if (result === 'cancelled') return;
    onOpenChange(false);
    if (result === 'copied') toast.show({ message: copied, tone: 'success' });
  };

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={ts.title} description={ts.description}>
      <div className="flex flex-col [&>*:last-child]:border-b-0">
        <RowButton
          icon="link"
          label={ts.link}
          description={ts.linkHint}
          onPress={async () => done(await shareRecipe(recipe, requestId, t))}
        />
        <RowButton
          icon="share"
          label={ts.text}
          description={ts.textHint}
          onPress={async () => done(await shareRecipeAsText(recipe, requestId, t, photo), ts.textCopied)}
        />
        <RowButton
          icon="paste"
          label={ts.copy}
          description={ts.copyHint}
          onPress={async () => {
            await copyRecipeLink(recipe, requestId);
            done('copied');
          }}
        />
      </div>
    </Sheet>
  );
}
