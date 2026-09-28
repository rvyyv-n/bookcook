import { Keyboard, Link } from 'react-aria-components';
import { ButtonLink } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';
import { Logo } from './Logo';
import type { NavItem } from './TabBar';

/** Desktop navigation: logo and wordmark, the New recipe button, then one 56px row per destination. */
export function Sidebar({
  label,
  wordmark,
  newItem,
  items,
  shortcutsHint,
}: {
  label: string;
  wordmark: string;
  newItem: { href: string; label: string };
  items: NavItem[];
  /** The words either side of the "?" key: ["Press", "for shortcuts"]. */
  shortcutsHint: readonly [string, string];
}) {
  return (
    <nav
      aria-label={label}
      className="no-print flex h-full w-[252px] flex-none flex-col gap-1 overflow-y-auto border-r border-line bg-sunk px-3.5 py-5"
    >
      <Link
        href="/"
        className="type-display flex items-center gap-2.5 self-start rounded-sm px-2 pt-0.5 pb-4 text-xl leading-none text-ink no-underline"
      >
        <Logo variant="rice" className="size-9 shrink-0 dark:hidden" />
        <Logo variant="dark" className="hidden size-9 shrink-0 dark:block" />
        {wordmark}
      </Link>
      <ButtonLink href={newItem.href} variant="primary" icon="add" className="mb-2.5 gap-1.5 text-base!">
        {newItem.label}
      </ButtonLink>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.current ? 'page' : undefined}
          className={cx(
            'flex min-h-[3.5rem] items-center gap-2.5 rounded-sm px-3 text-ink no-underline data-[focus-visible]:outline-offset-[-3px]',
            it.current ? 'bg-surface font-bold shadow-paper' : 'data-[hovered]:bg-line',
          )}
        >
          <Icon name={it.icon} current={it.current} className="shrink-0" />
          {it.label}
        </Link>
      ))}
      <p className="mt-auto px-3 pt-3.5 text-[15px] leading-[1.35] text-ink-muted">
        {shortcutsHint[0]}{' '}
        <Keyboard className="rounded-[6px] font-[inherit] px-1.5 font-bold shadow-[inset_0_0_0_1px_var(--line-strong)]">?</Keyboard>{' '}
        {shortcutsHint[1]}
      </p>
    </nav>
  );
}
