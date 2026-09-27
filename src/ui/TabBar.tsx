import { Link } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  current: boolean;
}

const item =
  'flex min-h-16 min-w-0 flex-col items-center gap-[3px] rounded-sm text-center text-[min(var(--text-sm),15px)] leading-[1.1] no-underline';

/**
 * Phone navigation: five equal columns, every item labelled. The New disc stays inside its own
 * column and never overlaps its neighbours.
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
  const tab = (it: NavItem) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={it.current ? 'page' : undefined}
      className={cx(item, 'justify-center', it.current ? 'font-bold text-ink' : 'text-ink-muted')}
    >
      <Icon name={it.icon} current={it.current} />
      {it.label}
    </Link>
  );
  return (
    <nav
      aria-label={label}
      data-tab-bar
      className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-line bg-paper bg-(image:--grain) px-1 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))]"
    >
      {tab(a)}
      {tab(b)}
      <Link href={newItem.href} className={cx(item, 'justify-end font-bold text-ink')}>
        <span className="grid size-[2.9rem] place-items-center rounded-full bg-(--tab-new-bg) text-(--tab-new-fg) shadow-paper">
          <Icon name="add" size="1.8rem" />
        </span>
        {newItem.label}
      </Link>
      {tab(c)}
      {tab(d)}
    </nav>
  );
}
