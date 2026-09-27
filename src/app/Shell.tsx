import { matchPath, Outlet, useLocation } from 'react-router';
import { useRecipes } from '../db/hooks';
import { LibraryFilterProvider } from '../features/library/filter';
import { LibraryList } from '../features/library/LibraryList';
import { useT } from '../i18n';
import { cx } from '../ui/cx';
import type { IconName } from '../ui/Icon';
import { Sidebar } from '../ui/Sidebar';
import { TabBar, type NavItem } from '../ui/TabBar';
import { Shortcuts } from './shortcuts';
import { useIsDesktop } from './useMediaQuery';

/** Routes that take over the phone screen (no tab bar): editors and guided capture. */
const FOCUSED = ['/new/:mode/:draftId', '/r/:id/edit', '/import'];

/** Routes that show the recipe list pane on desktop. */
const LIBRARY = ['/', '/r/:id', '/c/:id', '/t/:tag'];

type Section = 'cookbook' | 'collections' | 'tags' | 'grocery' | 'requests' | 'settings';

const SECTIONS: { id: Section; href: string; icon: IconName; match: string[] }[] = [
  { id: 'cookbook', href: '/', icon: 'cookbook', match: ['/', '/r/*'] },
  { id: 'collections', href: '/c', icon: 'collections', match: ['/c', '/c/*'] },
  { id: 'tags', href: '/t', icon: 'tags', match: ['/t', '/t/*'] },
  { id: 'grocery', href: '/grocery', icon: 'grocery', match: ['/grocery'] },
  { id: 'requests', href: '/requests', icon: 'requests', match: ['/requests'] },
  { id: 'settings', href: '/settings', icon: 'settings', match: ['/settings'] },
];

const matches = (patterns: string[], pathname: string) => patterns.some((p) => matchPath(p, pathname));

function useNavItems(): Record<Section, NavItem> {
  const t = useT();
  const { pathname } = useLocation();
  const entries = SECTIONS.map((s) => [s.id, { href: s.href, icon: s.icon, label: t.ui.nav[s.id], current: matches(s.match, pathname) }]);
  return Object.fromEntries(entries) as Record<Section, NavItem>;
}

function PhoneShell() {
  const t = useT();
  const nav = useNavItems();
  const { pathname } = useLocation();
  const focused = matches(FOCUSED, pathname);
  return (
    <div className="min-h-dvh">
      <main
        id="main"
        className={cx(
          'mx-auto w-full max-w-3xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]',
          focused ? 'pb-8' : 'pb-[calc(3.5556rem+3rem+env(safe-area-inset-bottom))]',
        )}
      >
        <Outlet />
      </main>
      {!focused && (
        <TabBar
          label={t.ui.nav.main}
          items={[nav.cookbook, nav.grocery, nav.requests, nav.settings]}
          newItem={{ href: '/new', label: t.ui.nav.add }}
        />
      )}
    </div>
  );
}

function DesktopShell() {
  const t = useT();
  const nav = useNavItems();
  const { pathname } = useLocation();
  const library = matches(LIBRARY, pathname);
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        label={t.ui.nav.main}
        wordmark={t.ui.appName}
        newItem={{ href: '/new', label: t.ui.nav.newRecipe }}
        items={[nav.cookbook, nav.collections, nav.tags, nav.grocery, nav.requests, nav.settings]}
        shortcutsHint={t.ui.nav.shortcutsHint as readonly [string, string]}
      />
      {library ? (
        <>
          <section
            aria-label={t.ui.library.recipes}
            className="no-print w-[380px] flex-none overflow-y-auto border-r border-line px-6 py-6"
          >
            <LibraryList compact />
          </section>
          <main id="main" className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
            <Outlet />
          </main>
        </>
      ) : (
        <main id="main" className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-4xl">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}

export function AppShell() {
  const desktop = useIsDesktop();
  return (
    <LibraryFilterProvider>
      <Shortcuts />
      {desktop ? <DesktopShell /> : <PhoneShell />}
    </LibraryFilterProvider>
  );
}

/** Home: the library on phones; on desktop the list is in its own pane, so show a gentle prompt. */
export function LibraryHome() {
  const t = useT();
  const desktop = useIsDesktop();
  const recipes = useRecipes();
  if (!desktop) return <LibraryList />;
  if (!recipes?.length) return null;
  return (
    <div className="grid h-full place-items-center">
      <p className="type-display max-w-sm text-center text-2xl text-ink-muted italic">{t.ui.library.selectRecipe}</p>
    </div>
  );
}
