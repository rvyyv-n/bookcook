import { Link as AriaLink } from 'react-aria-components';
import { matchPath, NavLink, Outlet, useLocation } from 'react-router';
import { useCollections, useRecipes, useTags } from '../db/hooks';
import { LibraryFilterProvider, useLibraryFilter } from '../features/library/filter';
import { LibraryList } from '../features/library/LibraryList';
import { useT } from '../i18n';
import { ButtonLink } from '../ui/Button';
import { cx } from '../ui/cx';
import { Icon, type IconName } from '../ui/Icon';
import { Shortcuts } from './shortcuts';
import { useIsDesktop } from './useMediaQuery';

/** Routes that take over the phone screen (no tab bar): editors and guided capture. */
const FOCUSED = ['/new/:mode', '/r/:id/edit', '/import'];

function Wordmark() {
  return (
    <span className="type-display text-2xl font-semibold tracking-tight">
      Book<span className="text-accent-text italic">cook</span>
    </span>
  );
}

function TabLink({ to, icon, label, end }: { to: string; icon: IconName; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[clamp(12px,0.7778rem,15px)] leading-tight font-bold no-underline outline-none',
          'focus-visible:outline-3 focus-visible:outline-(--focus)',
          isActive ? 'text-ink' : 'text-ink-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cx('grid h-8 w-14 max-w-full place-items-center rounded-full transition-colors', isActive && 'bg-accent-soft')}>
            <Icon name={icon} size={24} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function MobileShell() {
  const t = useT();
  const { pathname } = useLocation();
  const focused = FOCUSED.some((p) => matchPath(p, pathname));
  return (
    <div className="min-h-dvh">
      <main
        id="main"
        className={cx('mx-auto w-full max-w-3xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]', focused ? 'pb-8' : 'pb-36')}
      >
        <Outlet />
      </main>
      {!focused && (
        <nav
          aria-label={t.ui.nav.main}
          className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85"
        >
          <div className="mx-auto flex max-w-xl items-end gap-1 px-2 pt-1 pb-1">
            <TabLink to="/" end icon="book" label={t.ui.nav.cookbook} />
            <TabLink to="/grocery" icon="basket" label={t.ui.nav.grocery} />
            <AriaLink
              href="/new"
              aria-label={t.ui.nav.newRecipe}
              className="-mt-6 flex min-w-0 flex-1 flex-col items-center gap-0.5 text-[clamp(12px,0.7778rem,15px)] leading-tight font-bold text-ink no-underline outline-none data-[focus-visible]:outline-3"
            >
              <span className="grid size-[64px] place-items-center rounded-full bg-accent text-accent-ink shadow-lift ring-4 ring-paper transition-transform data-[pressed]:scale-95">
                <Icon name="plus" size={30} strokeWidth={2.4} />
              </span>
              {t.ui.nav.add}
            </AriaLink>
            <TabLink to="/requests" icon="wish" label={t.ui.nav.requests} />
            <TabLink to="/settings" icon="settings" label={t.ui.nav.settings} />
          </div>
        </nav>
      )}
    </div>
  );
}

function SideLink({ to, icon, label, end }: { to: string; icon: IconName; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex min-h-12 items-center gap-3 rounded-lg px-3 font-bold no-underline outline-none focus-visible:outline-3 focus-visible:outline-(--focus)',
          isActive ? 'bg-accent-soft text-ink' : 'text-ink-muted hover:bg-sunk hover:text-ink',
        )
      }
    >
      <Icon name={icon} size={22} />
      {label}
    </NavLink>
  );
}

function SidebarFilters() {
  const t = useT();
  const collections = useCollections();
  const tags = useTags();
  const recipes = useRecipes();
  const filter = useLibraryFilter();
  const { pathname } = useLocation();
  const inLibrary = pathname === '/' || pathname.startsWith('/r/');
  const item = (active: boolean) =>
    cx(
      'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left outline-none focus-visible:outline-3 focus-visible:outline-(--focus)',
      active && inLibrary ? 'bg-sunk font-bold text-ink' : 'text-ink-muted hover:text-ink',
    );
  return (
    <>
      {collections && collections.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <h2 className="px-3 pb-1 font-body text-sm font-bold text-ink-muted">{t.ui.nav.collections}</h2>
          {collections.map((c) => (
            <AriaLink
              key={c.id}
              href="/"
              onPress={() => filter.set({ collectionId: c.id, tag: null })}
              className={item(filter.collectionId === c.id)}
            >
              <Icon name="folder" size={18} />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-sm">{recipes?.filter((r) => r.collectionIds.includes(c.id)).length}</span>
            </AriaLink>
          ))}
        </div>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <h2 className="px-3 pb-1 font-body text-sm font-bold text-ink-muted">{t.ui.nav.tags}</h2>
          {tags.map((tag) => (
            <AriaLink key={tag} href="/" onPress={() => filter.set({ tag, collectionId: null })} className={item(filter.tag === tag)}>
              <Icon name="tag" size={18} />
              <span className="truncate">{tag}</span>
            </AriaLink>
          ))}
        </div>
      )}
    </>
  );
}

function DesktopShell() {
  const t = useT();
  const { pathname } = useLocation();
  const library = pathname === '/' || (/^\/r\/[^/]+(\/edit)?$/.test(pathname) && !pathname.endsWith('/cook'));
  return (
    <div className="grid h-dvh grid-cols-[17rem_1fr] overflow-hidden">
      <aside className="no-print flex flex-col gap-6 overflow-y-auto border-r border-line bg-sunk/60 px-4 py-6">
        <AriaLink href="/" className="px-3 text-ink no-underline outline-none data-[focus-visible]:outline-3">
          <Wordmark />
        </AriaLink>
        <ButtonLink href="/new" variant="primary" icon="plus" className="w-full">
          {t.ui.nav.newRecipe}
        </ButtonLink>
        <nav aria-label={t.ui.nav.main} className="flex flex-col gap-1">
          <SideLink to="/" end icon="book" label={t.ui.nav.cookbook} />
          <SideLink to="/grocery" icon="basket" label={t.ui.nav.grocery} />
          <SideLink to="/requests" icon="wish" label={t.ui.nav.requests} />
          <SideLink to="/settings" icon="settings" label={t.ui.nav.settings} />
        </nav>
        <SidebarFilters />
      </aside>
      {library ? (
        <div className="grid grid-cols-[minmax(20rem,26rem)_1fr] overflow-hidden">
          <section aria-label={t.ui.library.recipes} className="no-print overflow-y-auto border-r border-line px-6 py-6">
            <LibraryList compact />
          </section>
          <main id="main" className="overflow-y-auto px-10 py-8">
            <Outlet />
          </main>
        </div>
      ) : (
        <main id="main" className="overflow-y-auto px-10 py-8">
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
      {desktop ? <DesktopShell /> : <MobileShell />}
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
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Wordmark />
        <p className="type-display text-2xl text-ink-muted italic">{t.ui.library.selectRecipe}</p>
      </div>
    </div>
  );
}
