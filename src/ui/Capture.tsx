import type { ReactNode } from 'react';
import { Button as AriaButton, Link } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

const disc = 'grid shrink-0 place-items-center rounded-full';
const title = 'type-display text-xl leading-[1.05]';

/**
 * One way to add a recipe in the New recipe chooser: an accent-soft icon disc, the title in the display
 * face and one muted line. `row` is the phone sheet's layout, `tile` the desktop dialog's 2×2 grid.
 * `unavailable` is the dashed, non-interactive box (Tell it when the browser can't hear).
 */
export function ChoiceCard({
  icon,
  title: heading,
  line,
  layout = 'row',
  unavailable = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  line: ReactNode;
  layout?: 'row' | 'tile';
  unavailable?: boolean;
  onPress?: () => void;
}) {
  const row = layout === 'row';
  const shape = row
    ? 'grid min-h-[5.6rem] grid-cols-[3.4rem_minmax(0,1fr)] items-center gap-3.5 px-4 py-3.5'
    : 'flex min-h-[9rem] flex-col items-start gap-2.5 p-4.5';
  const discSize = row ? 'size-[3.4rem]' : 'size-[3.2rem]';
  const iconSize = row ? '1.8rem' : '1.7rem';
  const text = (
    <span className={cx('flex min-w-0 flex-col', row ? 'gap-[3px]' : 'contents')}>
      <span className={cx(title, unavailable && 'text-ink')}>{heading}</span>
      <span className={cx('leading-[1.3] [text-wrap:pretty]', !unavailable && 'text-ink-muted')}>{line}</span>
    </span>
  );
  if (unavailable)
    return (
      <div aria-disabled="true" className={cx(shape, 'rounded-lg border-[1.5px] border-dashed border-line-control text-ink-muted')}>
        <span className={cx(disc, discSize, 'bg-sunk')}>
          <Icon name="micOff" size={iconSize} />
        </span>
        {text}
      </div>
    );
  return (
    <AriaButton
      onPress={onPress}
      className={cx(
        shape,
        'rounded-lg bg-paper text-left text-ink shadow-[var(--shadow-paper),inset_0_0_0_1px_var(--line)] transition-[box-shadow,transform] duration-(--dur)',
        'data-[hovered]:shadow-[var(--shadow-lift),inset_0_0_0_1px_var(--line-strong)] data-[pressed]:scale-[.98]',
      )}
    >
      <span className={cx(disc, discSize, 'bg-accent-soft text-accent-text')}>
        <Icon name={icon} size={iconSize} />
      </span>
      {text}
    </AriaButton>
  );
}

/** A spinning ring in the accent (it stands still with reduced motion). Fills its positioned parent. */
export function Spinner() {
  return <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-4 border-accent-soft border-t-(--accent-mark)" />;
}

/** "Tidying it up…": the wand in a spinner, a line on what's happening, and skeleton lines. */
export function Working({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div role="status" className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3.5 pt-10 pb-5 text-center">
        <span className="relative grid size-20 place-items-center">
          <Spinner />
          <Icon name={icon} size="2.2rem" className="text-accent-text" />
        </span>
        <b className="text-lg">{title}</b>
        <span className="max-w-[17.5rem] text-ink-muted">{body}</span>
      </div>
      <div aria-hidden className="flex flex-col gap-2.5 opacity-60">
        {['70%', '90%', '55%'].map((w) => (
          <span key={w} className="h-[1.1rem] rounded-[6px] bg-line" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

/** From a link, loading: a small spinner and "Reading the page…" over a picture and two skeleton lines. */
export function LinkLoading({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-3.5 rounded-lg bg-surface p-4 shadow-paper">
      <span className="flex items-center gap-3">
        <span className="relative size-[2.2rem] shrink-0">
          <Spinner />
        </span>
        <b>{children}</b>
      </span>
      <span aria-hidden className="aspect-video w-full rounded-sm bg-sunk" />
      <span aria-hidden className="h-[1.1rem] w-3/4 rounded-[6px] bg-line" />
      <span aria-hidden className="h-[1.1rem] w-1/2 rounded-[6px] bg-line" />
    </div>
  );
}

/** From a link, failed: on --danger-soft, why, and a way to Paste it instead. */
export function LinkFailed({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg bg-danger-soft p-4.5 text-ink">
      <span className="flex items-center gap-2.5 text-lg font-bold text-danger">
        <Icon name="failed" className="shrink-0" />
        {title}
      </span>
      <span className="[text-wrap:pretty]">{body}</span>
      <AriaButton
        onPress={onAction}
        className="flex min-h-14 items-center gap-1.5 self-start rounded-md bg-surface pr-4 pl-3 font-bold text-ink shadow-paper transition-transform duration-(--dur) data-[pressed]:scale-[.97]"
      >
        <Icon name="paste" className="shrink-0" />
        {action}
      </AriaButton>
    </div>
  );
}

/** "Or just talk freely": deliberately quieter than the four choices. */
export function QuietLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Link
      onPress={onPress}
      className="flex min-h-14 cursor-pointer items-center gap-1.5 self-center px-3 font-bold text-ink-muted underline underline-offset-4 data-[hovered]:text-ink"
    >
      {children}
    </Link>
  );
}
