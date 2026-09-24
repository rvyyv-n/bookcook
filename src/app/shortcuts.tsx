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
    <div className="flex flex-col gap-6">
      {t.ui.shortcuts.groups.map((g) => (
        <section key={g.title}>
          <h3 className="mb-2 font-body text-base font-bold">{g.title}</h3>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2">
            {g.items
              .map((item) => item as readonly [string, string])
              .map(([keys, label]) => (
                <div key={label} className="contents">
                  <dt>
                    {keys.split(' ').map((k) => (
                      <Keyboard
                        key={k}
                        className="mr-1 inline-grid min-w-9 place-items-center rounded-md border-2 border-b-4 border-line-strong bg-surface px-2 py-0.5 font-bold"
                      >
                        {k}
                      </Keyboard>
                    ))}
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** Desktop keyboard shortcuts: / search, n new, e edit, c cook, g grocery, ? help. */
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
        case 'g':
          navigate('/grocery');
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
    <Sheet isOpen={help} onOpenChange={setHelp} title={t.ui.common.keyboardShortcuts}>
      <ShortcutList />
    </Sheet>
  );
}
