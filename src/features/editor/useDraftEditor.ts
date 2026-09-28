import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDraft, getDraft, saveDraft } from '../../db/drafts';
import type { Draft, Recipe } from '../../db/types';
import { ingredientsToLines, linesToIngredients, type IngredientLine } from './model';

export interface EditorState {
  recipe: Partial<Recipe>;
  lines: IngredientLine[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved';

const HISTORY_LIMIT = 100;
/** Autosave after this long without a change. */
const SAVE_MS = 500;

/**
 * Local editing state for a draft, autosaved to IndexedDB on every change (debounced),
 * with an undo history for Ctrl/⌘+Z. When the editor goes away the draft is saved, unless
 * `discard` says it isn't worth keeping (nothing typed yet), in which case it's deleted.
 */
export function useDraftEditor(
  draftId: string | undefined,
  { discard }: { discard?: (state: EditorState, draft: Draft, edited: boolean) => boolean } = {},
) {
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [state, setState] = useState<EditorState | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const history = useRef<EditorState[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<{ draft: Draft; state: EditorState } | null>(null);
  const lastEdit = useRef<{ key?: string; at: number }>({ at: 0 });
  const discardRef = useRef(discard);
  const editedRef = useRef(false);
  useEffect(() => {
    discardRef.current = discard;
  });

  useEffect(() => {
    let alive = true;
    if (!draftId) return;
    void getDraft(draftId).then((d) => {
      if (!alive) return;
      setDraft(d ?? null);
      if (d) {
        const s = { recipe: d.recipe, lines: d.ingredientLines ?? ingredientsToLines(d.recipe.ingredients) };
        if (!s.lines.length) s.lines = [{ id: crypto.randomUUID(), text: '' }];
        setState(s);
        latest.current = { draft: d, state: s };
      }
    });
    return () => {
      alive = false;
    };
  }, [draftId]);

  const persist = useCallback(async () => {
    clearTimeout(timer.current);
    const cur = latest.current;
    if (!cur) return;
    const recipe = { ...cur.state.recipe, ingredients: linesToIngredients(cur.state.lines) };
    await saveDraft({ ...cur.draft, recipe, ingredientLines: cur.state.lines });
    setStatus('saved');
  }, []);

  // Save when leaving the page or the editor.
  useEffect(() => {
    const onHide = () => void persist();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      const cur = latest.current;
      if (cur && discardRef.current?.(cur.state, cur.draft, editedRef.current)) {
        clearTimeout(timer.current);
        latest.current = null;
        void deleteDraft(cur.draft.id);
      } else void persist();
    };
  }, [persist]);

  const update = useCallback(
    (fn: (s: EditorState) => EditorState, { record = true, key }: { record?: boolean; key?: string } = {}) => {
      const cur = latest.current;
      if (!cur) return;
      const next = fn(cur.state);
      if (next === cur.state) return;
      // Typing in one field within a second counts as one undo step.
      const now = Date.now();
      const burst = key !== undefined && lastEdit.current.key === key && now - lastEdit.current.at < 1200;
      lastEdit.current = { key, at: now };
      if (record && !burst) {
        history.current.push(cur.state);
        if (history.current.length > HISTORY_LIMIT) history.current.shift();
      }
      latest.current = { ...cur, state: next };
      editedRef.current = true;
      setState(next);
      setStatus('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), SAVE_MS);
    },
    [persist],
  );

  const setRecipe = useCallback(
    (patch: Partial<Recipe>, opts?: { record?: boolean; key?: string }) =>
      update((s) => ({ ...s, recipe: { ...s.recipe, ...patch } }), { key: Object.keys(patch).join(','), ...opts }),
    [update],
  );

  const undo = useCallback(() => {
    lastEdit.current = { at: 0 };
    const prev = history.current.pop();
    if (!prev) return false;
    setState(prev);
    if (latest.current) latest.current = { ...latest.current, state: prev };
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), SAVE_MS);
    return true;
  }, [persist]);

  /** Whether anything has changed since the editor opened. */
  const edited = status !== 'idle';

  /** Save now and stop autosaving: the draft is about to be committed or thrown away. */
  const finish = useCallback(async () => {
    await persist();
    latest.current = null;
  }, [persist]);

  return { draft, state, status, update, setRecipe, undo, flush: persist, finish, edited };
}
