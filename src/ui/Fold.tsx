import type { ReactNode } from 'react';
import { DisclosurePanel } from 'react-aria-components';
import { cx } from './cx';

/**
 * The body of a fold (a React Aria Disclosure): it opens to its height as its content fades in, and
 * on closing the content fades out first, quicker, as things leaving do. --disclosure-panel-height
 * is React Aria's.
 */
export function FoldPanel({
  children,
  className,
  panelClassName,
}: {
  children: ReactNode;
  /** On the content, which fades. */
  className?: string;
  /** On the panel itself, which doesn't: a background that continues the fold's header. */
  panelClassName?: string;
}) {
  return (
    <DisclosurePanel
      className={cx('h-(--disclosure-panel-height) overflow-clip transition-[height] duration-(--dur) ease-(--ease-out)', panelClassName)}
    >
      <div
        className={cx(
          'opacity-0 transition-opacity duration-(--dur-exit) ease-(--ease-in)',
          'in-data-[expanded]:opacity-100 in-data-[expanded]:duration-(--dur) in-data-[expanded]:ease-(--ease-out)',
          className,
        )}
      >
        {children}
      </div>
    </DisclosurePanel>
  );
}
