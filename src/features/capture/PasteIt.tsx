import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { deleteDraft, getDraft, patchDraft } from '../../db/drafts';
import { useDraft } from '../../db/hooks';
import { useT } from '../../i18n';
import { parsePaste } from '../../lib/parse/paste';
import { readClipboard } from '../../lib/platform/clipboard';
import { Button } from '../../ui/Button';
import { Working } from '../../ui/Capture';
import { TextField } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { draftFromParsed, isBlankDraft } from '../editor/model';
import { useLeave } from './NewRecipe';

/** How long "Tidying it up…" stays up at least, so it reads as a step rather than a flash. */
const TIDY_MS = 500;

/**
 * `/new/paste/:draftId`: paste a recipe as it is (WhatsApp, notes, email), then Tidy it up sorts it into
 * ingredients and steps and opens Check your recipe. The pasted text is kept with the draft.
 */
export function PasteItPage() {
  const { draftId } = useParams();
  const t = useT();
  const p = t.ui.paste;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();
  const leave = useLeave();
  const draft = useDraft(draftId);
  const [typed, setTyped] = useState<string | null>(null);
  const [tidying, setTidying] = useState(false);
  const value = typed ?? (typeof draft?.progress?.pasted === 'string' ? draft.progress.pasted : '');

  // Keep the text with the draft; a draft left with nothing pasted is thrown away.
  const latest = useRef({ value, done: false });
  useEffect(() => {
    latest.current.value = value;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(false);
  useEffect(() => {
    // The pasted text is read when leaving, so it's the latest, not what it was on arrival.
    const live = latest;
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      const { value: text, done } = live.current;
      if (!draftId || done) return;
      if (text.trim()) return void patchDraft(draftId, { progress: { pasted: text } });
      // Only once the page has really gone: a remount (StrictMode) comes straight back.
      setTimeout(() => {
        if (mounted.current) return;
        void getDraft(draftId).then((d) => {
          if (d && isBlankDraft(d.recipe, d.ingredientLines ?? [])) void deleteDraft(d.id);
        });
      });
    };
  }, [draftId]);

  function change(text: string) {
    setTyped(text);
    clearTimeout(timer.current);
    if (draftId) timer.current = setTimeout(() => void patchDraft(draftId, { progress: { pasted: text } }), 500);
  }

  async function pasteClipboard() {
    try {
      const text = await readClipboard();
      if (text) change(text);
    } catch {
      toast.show({ message: p.clipboardFailed });
    }
  }

  async function tidy() {
    const source = value.trim();
    if (!source || !draftId || tidying) return;
    setTidying(true);
    const parsed = parsePaste(source);
    await new Promise((r) => setTimeout(r, TIDY_MS));
    if (!parsed.ingredients.length && !parsed.steps.length) {
      setTidying(false);
      toast.show({ message: p.nothingFound });
      return;
    }
    const current = await getDraft(draftId);
    await patchDraft(draftId, {
      recipe: { ...current?.recipe, ...draftFromParsed(parsed) },
      ingredientLines: undefined,
      step: 'review',
      progress: { pasted: value },
    });
    latest.current.done = true;
    navigate(`/new/review/${draftId}`);
  }

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;

  const field = (
    <TextField
      multiline
      label={p.label}
      labelHidden={desktop}
      placeholder={p.placeholder}
      value={value}
      onChange={change}
      dictate={false}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void tidy();
      }}
      inputClassName={desktop ? 'min-h-[24rem] leading-[1.5] p-4.5' : 'min-h-[22rem] leading-[1.45]'}
    />
  );
  const pasteButton = !value && (
    <Button variant="secondary" size="XL" icon="paste" onPress={() => void pasteClipboard()} className={desktop ? undefined : 'w-full'}>
      {p.paste}
    </Button>
  );
  const tidyButton = (
    <Button
      variant="primary"
      size="XL"
      icon="tidy"
      isDisabled={!value.trim() || tidying}
      onPress={() => void tidy()}
      className={desktop ? undefined : 'w-full'}
    >
      {p.tidy}
    </Button>
  );
  const working = <Working icon="tidy" title={p.tidying} body={p.tidyingBody} />;

  if (desktop)
    return (
      <div className="flex min-h-full max-w-[860px] flex-col gap-4.5 px-16 py-10">
        <h1 className="text-3xl leading-[1.05] tracking-[-0.02em]">{p.title}</h1>
        <p className="text-lg text-ink-muted">{p.helper}</p>
        {tidying ? working : field}
        <div className="flex items-center justify-end gap-3">
          <span className="mr-auto">{pasteButton}</span>
          <span className="text-[0.875rem] text-ink-muted">{p.ctrlEnter}</span>
          {tidyButton}
        </div>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2">
        <Button variant="quiet" icon="back" onPress={leave} className="px-[.8rem]">
          {t.ui.common.back}
        </Button>
      </div>
      <div className="flex flex-col gap-2.5 px-5 pt-6">
        <h1 className="text-2xl leading-[1.1] tracking-[-0.015em]">{p.title}</h1>
        <p className="text-ink-muted">{p.helper}</p>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-5.5">
        {tidying ? (
          working
        ) : (
          <>
            {field}
            {pasteButton}
          </>
        )}
      </div>
      <div className="mt-auto px-4 pt-6 pb-[max(1.125rem,env(safe-area-inset-bottom))]">{tidyButton}</div>
    </div>
  );
}
