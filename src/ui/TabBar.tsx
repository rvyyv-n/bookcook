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

const item =
  'group flex min-h-[4rem] min-w-0 flex-col items-center gap-[3px] rounded-sm text-center text-[min(0.875rem,15px)] leading-[1.1] no-underline transition-transform duration-(--dur) data-[pressed]:scale-[.94]';

/**
 * Phone navigation: a bar floating just above the home indicator, rounded to the skin, with five
 * equal columns and every item labelled. The New disc stays inside its own column. A soft pill sits
 * behind the current tab and glides to the next one (settle); its icon lifts into place.
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
  // The columns, left to right, are a, b, New, c, d.
  const column = [a, b, null, c, d].findIndex((it) => it?.current);
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
      className={cx(item, 'justify-center', it.current ? 'font-bold text-ink' : 'text-ink-muted')}
    >
      {/* Settle: the newly current tab's icon lifts into place. */}
      <Icon name={it.icon} current={it.current} key={String(it.current)} className={it.current && lift ? 'animate-tab-in' : undefined} />
      {it.label}
    </Link>
  );
  return (
    <nav
      aria-label={label}
      data-tab-bar
      className={cx(
        'no-print [view-transition-name:tab-bar] fixed inset-x-3 bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)-0.25rem))] z-30 mx-auto max-w-[30rem]',
        // Frosted paper: the page scrolls softly underneath, and a hairline keeps the edge in the light theme.
        'grid grid-cols-5 items-stretch rounded-xl bg-surface/85 p-1.5 backdrop-blur-lg backdrop-saturate-150',
        'shadow-[inset_0_0_0_1px_var(--line),var(--shadow-lift)]',
      )}
    >
      {column >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-1.5 -z-10 rounded-lg bg-accent-soft transition-transform duration-(--dur-settle) ease-(--ease-settle)"
          style={{ width: 'calc((100% - 0.75rem) / 5)', transform: `translateX(${column * 100}%)` }}
        />
      )}
      {tab(a)}
      {tab(b)}
      <Link href={newItem.href} className={cx(item, 'justify-center font-bold text-ink')}>
        {/* Give: the disc presses in under the finger. */}
        <span className="grid size-[2.9rem] place-items-center rounded-full bg-(--tab-new-bg) text-(--tab-new-fg) shadow-paper transition-transform duration-(--dur) group-data-[pressed]:scale-90">
          <Icon name="add" size="1.8rem" />
        </span>
        {newItem.label}
      </Link>
      {tab(c)}
      {tab(d)}
    </nav>
  );
}
