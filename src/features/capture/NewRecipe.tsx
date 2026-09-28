import { useNavigate } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { createDraft } from '../../db/drafts';
import { useSettings } from '../../db/hooks';
import type { DraftMode } from '../../db/types';
import { useT } from '../../i18n';
import { speech } from '../../lib/speech';
import { ChoiceCard, QuietLink } from '../../ui/Capture';
import type { IconName } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { CookbookPage } from '../library/Cookbook';
import { draftHref } from '../library/SpecialCards';

const CHOICES: { mode: 'tell' | 'type' | 'paste' | 'link'; icon: IconName }[] = [
  { mode: 'tell', icon: 'mic' },
  { mode: 'type', icon: 'keyboard' },
  { mode: 'paste', icon: 'paste' },
  { mode: 'link', icon: 'link' },
];

/** Back to where the user came from, or the cookbook. */
export function useLeave(fallback = '/') {
  const navigate = useNavigate();
  return () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(fallback, { replace: true }));
}

/**
 * `/new`: the New recipe chooser, a sheet over the cookbook (a centred dialog on desktop). Picking a way
 * starts a draft and opens it. Without speech, Tell it explains why and Just talk is hidden.
 */
export function NewRecipePage() {
  const t = useT();
  const n = t.ui.newRecipe;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const settings = useSettings();
  const leave = useLeave();

  async function start(mode: DraftMode) {
    const author = settings.defaultAuthor || settings.lastAuthor;
    const draft = await createDraft(mode, { ...(author ? { author } : {}), ...(mode === 'type' ? { servings: 4 } : {}) });
    navigate(draftHref(draft), { replace: true });
  }

  const layout = desktop ? 'tile' : 'row';
  return (
    <>
      <CookbookPage />
      <Sheet isOpen onOpenChange={(open) => !open && leave()} title={n.title} size="wide" besideSidebar>
        <div className={desktop ? 'flex flex-col gap-4.5' : 'flex flex-col gap-3.5'}>
          <div className={desktop ? 'grid grid-cols-2 gap-3.5' : 'flex flex-col gap-3.5'}>
            {CHOICES.map(({ mode, icon }) =>
              mode === 'tell' && !speech.supported ? (
                <ChoiceCard key={mode} icon={icon} title={n.choices.tell.title} line={n.noSpeech} layout={layout} unavailable />
              ) : (
                <ChoiceCard
                  key={mode}
                  icon={icon}
                  title={n.choices[mode].title}
                  line={n.choices[mode].line}
                  layout={layout}
                  onPress={() => void start(mode)}
                />
              ),
            )}
          </div>
          {speech.supported && <QuietLink onPress={() => void start('talk')}>{n.justTalk}</QuietLink>}
        </div>
      </Sheet>
    </>
  );
}
