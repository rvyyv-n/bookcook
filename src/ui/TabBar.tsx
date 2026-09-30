import { useEffect } from 'react';
import { Link } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  current: boolean;
}

/** The tab that was current last time the bar drew, so only a change of tab lifts an icon. */
let lastCurrent: string | undefined;

// The icons and labels are capped in px (the labels are 14px at Normal), so at Large and Huge the
// bar stays the same size instead of squeezing its five columns.
const item =
  'group flex min-h-[min(4rem,72px)] min-w-0 flex-col items-center justify-center gap-1 rounded-md text-center text-[min(0.875rem,15px)] leading-[1.1] whitespace-nowrap no-underline transition-transform duration-(--dur) data-[pressed]:scale-[.94]';

/**
 * Phone navigation: a bar floating just above the home indicator, rounded to the skin, with five
 * equal columns and every item labelled. The New disc stays inside its own column. The current tab's
 * icon sits on a small soft pill that opens out from the middle (settle) as the icon lifts into place.
 */
export function TabBar({
  label,
  items,
  newItem,
}: {
  label: string;
  items: [NavItem, NavItem, NavItem, NavItem];
  newItem: Omit<NavItem, 'icon' | 'current'>;
}) {
  const [a, b, c, d] = items;
  const current = items.find((it) => it.current)?.href;
  // True only on the render where the tab changed; the icon's key changes then too, so it plays once.
  const lift = lastCurrent !== undefined && current !== lastCurrent;
  useEffect(() => {
    lastCurrent = current;
  }, [current]);
  const tab = (it: NavItem) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={it.current ? 'page' : undefined}
      className={cx(item, it.current ? 'font-bold text-ink' : 'text-ink-muted')}
    >
      <span className="relative isolate grid h-[min(2rem,36px)] w-[min(3.5rem,62px)] place-items-center">
        {/* The pill behind the current icon: only the icon's width, so the label has room either side. */}
        <span
          aria-hidden
          className={cx(
            'absolute inset-0 -z-10 rounded-full bg-accent-soft transition-[scale,opacity] duration-(--dur-settle) ease-(--ease-settle)',
            it.current ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0',
          )}
        />
        {/* Settle: the newly current tab's icon lifts into place. */}
        <Icon name={it.icon} current={it.current} key={String(it.current)} className={it.current && lift ? 'animate-tab-in' : undefined} />
      </span>
      {it.label}
    </Link>
  );
  return (
    <nav
      aria-label={label}
      data-tab-bar
      className={cx(
        'no-print [view-transition-name:tab-bar] fixed inset-x-2 bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.25rem))] z-30 mx-auto max-w-[30rem]',
        // Frosted paper: the page scrolls softly underneath, and a hairline keeps the edge in the light theme.
        'grid grid-cols-5 items-stretch rounded-xl bg-surface/85 px-1 py-1.5 backdrop-blur-lg backdrop-saturate-150',
        'shadow-[inset_0_0_0_1px_var(--line),var(--shadow-lift)]',
      )}
    >
      {tab(a)}
      {tab(b)}
      <Link href={newItem.href} className={cx(item, 'font-bold text-ink')}>
        {/* Give: the disc presses in under the finger. */}
        <span className="-my-1 grid size-[min(2.9rem,50px)] place-items-center rounded-full bg-(--tab-new-bg) text-(--tab-new-fg) shadow-paper transition-transform duration-(--dur) group-data-[pressed]:scale-90">
          <Icon name="add" size={28} />
        </span>
        {newItem.label}
      </Link>
      {tab(c)}
      {tab(d)}
    </nav>
  );
}
