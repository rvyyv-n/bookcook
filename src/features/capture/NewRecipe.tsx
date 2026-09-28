import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { createDraft, deleteDraft, patchDraft } from '../../db/drafts';
import { useDraft, useSettings } from '../../db/hooks';
import type { DraftMode } from '../../db/types';
import { useT } from '../../i18n';
import { speech } from '../../lib/speech';
import { Button } from '../../ui/Button';
import { ChoiceCard, QuietLink } from '../../ui/Capture';
import type { IconName } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { isBlankDraft } from '../editor/model';
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

/**
 * Tell it, Just talk and From a link come with voice capture and imports. Until then their drafts
 * open here, with a way to type the recipe instead.
 */
export function CaptureSoonPage() {
  const { mode, draftId } = useParams();
  const t = useT();
  const n = t.ui.newRecipe;
  const navigate = useNavigate();
  const draft = useDraft(draftId);
  const leave = useLeave();
  const title = mode === 'talk' ? n.talkTitle : mode === 'tell' || mode === 'link' ? n.choices[mode].title : n.title;

  async function close() {
    if (draft && isBlankDraft(draft.recipe, draft.ingredientLines ?? [])) await deleteDraft(draft.id);
    leave();
  }

  async function typeInstead() {
    if (!draftId) return;
    await patchDraft(draftId, { mode: 'type' });
    navigate(`/new/type/${draftId}`, { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col desk:min-h-full">
      <div className="flex items-center pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2 desk:px-7">
        <Button variant="quiet" icon="close" onPress={() => void close()} className="px-[.8rem]">
          {t.ui.common.close}
        </Button>
      </div>
      <div className="flex max-w-[40rem] flex-col gap-2.5 px-5 pt-6 desk:px-16">
        <h1 className="text-2xl leading-[1.1] tracking-[-0.015em]">{title}</h1>
        <p className="text-ink-muted">{n.soon}</p>
      </div>
      <div className="px-4 pt-6 desk:px-16">
        <Button variant="primary" size="XL" icon="keyboard" onPress={() => void typeInstead()} className="w-full desk:w-auto">
          {n.typeInstead}
        </Button>
      </div>
    </div>
  );
}
