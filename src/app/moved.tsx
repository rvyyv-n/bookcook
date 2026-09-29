import { useState } from 'react';
import { countDrafts } from '../db/drafts';
import { countRecipes } from '../db/recipes';
import { useBackUp } from '../features/settings/Backup';
import { useT } from '../i18n';
import { Button, ButtonLink } from '../ui/Button';
import { Sheet } from '../ui/Sheet';

/**
 * The old GitHub Pages copy of Bookcook points people to the new address. Recipes are kept per web
 * address, so a plain redirect would strand anything saved here: an empty copy goes straight to the
 * new address (keeping the path and any share link), and one with recipes asks for a backup first.
 */
const MOVED_TO = import.meta.env.VITE_MOVED_TO?.replace(/\/$/, '');

// Read before the router changes it: "/bookcook/r/1#x" is "/r/1#x" at the new address.
const here = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1) || '/';
const newAddress = MOVED_TO && MOVED_TO + here + window.location.search + window.location.hash;

/** The root route's loader. Resolves to true when the moved notice should show. */
export async function movedLoader(): Promise<boolean> {
  if (!newAddress) return false;
  if ((await countRecipes()) + (await countDrafts()) > 0) return true;
  window.location.replace(newAddress);
  // Keep the loading screen up while the browser leaves.
  return new Promise(() => {});
}

export function MovedSheet() {
  const m = useT().ui.moved;
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const { saving, backUp } = useBackUp();
  if (!MOVED_TO) return null;
  return (
    <Sheet isOpen={open} onOpenChange={setOpen} title={m.title}>
      <div className="flex flex-col gap-5">
        <p className="text-lg text-pretty">{saved ? m.backedUp : m.body(new URL(MOVED_TO).host)}</p>
        <div className="flex flex-wrap gap-2.5">
          {saved ? (
            <ButtonLink variant="primary" icon="next" href={MOVED_TO}>
              {m.open}
            </ButtonLink>
          ) : (
            <>
              <Button variant="primary" icon="backup" isDisabled={saving} onPress={async () => setSaved(await backUp())}>
                {m.backUp}
              </Button>
              <ButtonLink variant="secondary" icon="next" href={MOVED_TO}>
                {m.open}
              </ButtonLink>
            </>
          )}
          <Button variant="quiet" onPress={() => setOpen(false)}>
            {m.later}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
