import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { commitDraft, openEditDraft } from '../../db/drafts';
import { getRecipe } from '../../db/recipes';
import { setSetting } from '../../db/settings';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { KeyHints, SaveBar, SavedIndicator, SectionTabs, TabPanel, Tabs } from '../../ui/Editor';
import { useToast } from '../../ui/Toast';
import { isBlankDraft, linesToIngredients } from './model';
import { DeskDetails, DetailsFields, IngredientsEditor, StepsEditor, StoryEditor, type EditorApi } from './sections';
import { useDraftEditor } from './useDraftEditor';

type Section = 'details' | 'ingredients' | 'steps' | 'story';
const SECTIONS: Section[] = ['details', 'ingredients', 'steps', 'story'];

/** Back where the editor was opened from (or the recipe, or the cookbook). */
function useLeave(fallback: string) {
  const navigate = useNavigate();
  return () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(fallback, { replace: true }));
}

/** `/new/type/:draftId` */
export function TypeItPage() {
  const { draftId } = useParams();
  return <RecipeEditor key={draftId} draftId={draftId!} />;
}

/** `/r/:id/edit`: the same editor, on an edit draft of the saved recipe. */
export function EditRecipePage() {
  const { id } = useParams();
  const t = useT();
  const [opened, setOpened] = useState<{ id: string; fresh: boolean } | null>();
  useEffect(() => {
    let alive = true;
    void (async () => {
      const recipe = id ? await getRecipe(id) : undefined;
      const result = recipe ? await openEditDraft(recipe) : undefined;
      if (alive) setOpened(result ? { id: result.draft.id, fresh: result.fresh } : null);
    })();
    return () => {
      alive = false;
    };
  }, [id]);
  if (opened === null) return <p className="px-5 py-10">{t.ui.common.recipeNotFound}</p>;
  if (!opened) return null;
  return <RecipeEditor key={opened.id} draftId={opened.id} fresh={opened.fresh} />;
}

/**
 * Type it / Edit. Phone: one section at a time under numbered pills, with a sticky Save recipe bar.
 * Desktop: a top bar, the photo, title and meta pills, then ingredients beside steps, and the story.
 * Every change is saved to the draft; a draft with nothing in it is thrown away on the way out.
 */
function RecipeEditor({ draftId, fresh = false }: { draftId: string; fresh?: boolean }) {
  const t = useT();
  const e = t.ui.editor;
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const toast = useToast();
  const editor = useDraftEditor(draftId, {
    // An untouched edit draft made just now isn't worth keeping; nor is a new one with nothing in it.
    discard: (s, d, edited) => (d.mode === 'edit' ? fresh && !edited : isBlankDraft(s.recipe, s.lines)),
  });
  const { draft, state } = editor;
  const [section, setSection] = useState<Section>('details');
  const [nameError, setNameError] = useState(false);
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const isEdit = draft?.mode === 'edit';
  const leave = useLeave(draft?.recipeId ? `/r/${draft.recipeId}` : '/');
  const ingredients = useMemo(() => (state ? linesToIngredients(state.lines) : []), [state]);

  async function save() {
    if (!state || !draft) return;
    if (!state.recipe.title?.trim()) {
      setNameError(true);
      setSection('details');
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    await editor.finish();
    const recipe = await commitDraft(draft.id);
    if (recipe.author) void setSetting('lastAuthor', recipe.author);
    toast.show({ message: e.saved, tone: 'success' });
    if (isEdit && (window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(`/r/${recipe.id}`, { replace: true });
  }

  // Ctrl/⌘+S saves; Ctrl/⌘+Z undoes the last change.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const undo = editor.undo;
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const key = ev.key.toLowerCase();
      if (key === 's') {
        ev.preventDefault();
        void saveRef.current();
      } else if (key === 'z' && !ev.shiftKey) {
        ev.preventDefault();
        undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  if (draft === null) return <p className="px-5 py-10">{t.ui.common.notFound}</p>;
  if (!state || !draft) return null;

  const ed: EditorApi = { state, update: editor.update, setRecipe: editor.setRecipe };
  const saving = editor.status === 'saving';
  const saved = <SavedIndicator saving={saving} label={saving ? e.saving : e.draftSaved} />;
  const title = isEdit ? e.editTitle : e.crumb(e.newTitle, t.ui.newRecipe.choices.type.title);
  const setRecipe: EditorApi['setRecipe'] = (patch, opts) => {
    if (patch.title?.trim()) setNameError(false);
    editor.setRecipe(patch, opts);
  };
  const edNamed = { ...ed, setRecipe };

  if (desktop)
    return (
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-paper bg-(image:--grain) px-7 py-4">
          <h1 className="font-(family-name:--font-body) text-base font-bold text-ink-muted [font-variation-settings:normal]">{title}</h1>
          <span className="ml-auto">{saved}</span>
          <Button variant="primary" icon="check" onPress={() => void save()} className="pr-[1.3rem] pl-[1rem]">
            {t.ui.common.saveRecipe}
          </Button>
        </header>
        <div className="flex flex-1 flex-col gap-5.5 px-7 pt-6 pb-10">
          <DeskDetails ed={edNamed} nameError={nameError} titleRef={titleRef} />
          <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-start gap-10">
            <section aria-labelledby="ed-ingredients" className="flex min-w-0 flex-col">
              <h2 id="ed-ingredients" className="type-heading mb-1 text-xl">
                {e.tabs.ingredients}
              </h2>
              <IngredientsEditor ed={ed} dense />
            </section>
            <section aria-labelledby="ed-steps" className="flex min-w-0 flex-col">
              <h2 id="ed-steps" className="type-heading mb-1 text-xl">
                {e.tabs.steps}
              </h2>
              <StepsEditor ed={ed} ingredients={ingredients} dense />
            </section>
          </div>
          <section aria-labelledby="ed-story" className="flex flex-col gap-3 pt-4">
            <h2 id="ed-story" className="type-heading text-xl">
              {e.tabs.story}
            </h2>
            <StoryEditor ed={ed} desk />
          </section>
        </div>
        <footer className="sticky bottom-0 z-20 border-t border-line bg-paper bg-(image:--grain) px-7 py-3">
          <KeyHints
            items={[{ keys: e.keys.enter, text: e.keys.nextLine }, { keys: e.keys.save, text: e.keys.toSave }, { text: e.keys.section }]}
          />
        </footer>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <h1 className="sr-only">{isEdit ? e.editTitle : e.newTitle}</h1>
      <div className="flex items-center justify-between gap-2 pt-[max(1rem,env(safe-area-inset-top))] pr-5 pl-2">
        <Button variant="quiet" icon="close" onPress={leave} className="px-[.8rem]">
          {t.ui.common.close}
        </Button>
        {saved}
      </div>
      <Tabs selectedKey={section} onSelectionChange={(k) => setSection(k as Section)} className="flex flex-col">
        <SectionTabs label={e.sections} items={SECTIONS.map((id) => ({ id, label: e.tabs[id] }))} />
        <TabPanel id="details" className="outline-none">
          <DetailsFields ed={edNamed} nameError={nameError} titleRef={titleRef} />
        </TabPanel>
        <TabPanel id="ingredients" className="outline-none">
          <IngredientsEditor ed={ed} />
        </TabPanel>
        <TabPanel id="steps" className="outline-none">
          <StepsEditor ed={ed} ingredients={ingredients} />
        </TabPanel>
        <TabPanel id="story" className="outline-none">
          <StoryEditor ed={ed} />
        </TabPanel>
      </Tabs>
      <SaveBar>
        <Button variant="primary" size="XL" icon="check" onPress={() => void save()} className="w-full">
          {t.ui.common.saveRecipe}
        </Button>
      </SaveBar>
    </div>
  );
}
