import { useEffect, useState } from 'react';
import { Keyboard } from 'react-aria-components';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { useT } from '../i18n';
import { Sheet } from '../ui/Sheet';

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'textbox';
}

export function ShortcutList() {
  const t = useT();
  return (
    <dl className="flex flex-col">
      {t.ui.shortcuts.items
        .map((item) => item as readonly [string, string])
        .map(([keys, label]) => (
          <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 border-b border-line py-1.5">
            <dt>
              <Keyboard className="rounded-[6px] font-[inherit] px-2 py-0.5 font-bold shadow-[inset_0_0_0_1.5px_var(--line-strong)]">
                {keys}
              </Keyboard>
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Desktop keyboard shortcuts: / search, n new, e edit, c cook, ? help. */
export function Shortcuts() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]') && e.key !== '?') return;
      const recipe = matchPath('/r/:id', pathname);
      switch (e.key) {
        case '/': {
          e.preventDefault();
          if (pathname !== '/' && !recipe) navigate('/');
          requestAnimationFrame(() => document.getElementById('library-search')?.focus());
          break;
        }
        case 'n':
          navigate('/new');
          break;
        case 'e':
          if (recipe) navigate(`/r/${recipe.params.id}/edit`);
          break;
        case 'c':
          if (recipe) navigate(`/r/${recipe.params.id}/cook`);
          break;
        case '?':
          setHelp((h) => !h);
          break;
        default:
          return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, pathname]);

  return (
    <Sheet isOpen={help} onOpenChange={setHelp} title={t.ui.common.keyboardShortcuts} placement="corner">
      <ShortcutList />
    </Sheet>
  );
}
