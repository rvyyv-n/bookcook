import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type TimerChipState = 'idle' | 'running' | 'paused' | 'done';

/**
 * The timer chip: a duration in step text ("25 minutes"), sized with the text around it.
 * idle: tap to start a timer · running: the time left, tap to pause · done: a check.
 */
export function TimerChip({
  state,
  children,
  ariaLabel,
  onPress,
}: {
  state: TimerChipState;
  children: ReactNode;
  ariaLabel: string;
  onPress: () => void;
}) {
  const icon: IconName = state === 'done' ? 'check' : state === 'paused' ? 'pause' : 'timer';
  return (
    <AriaButton
      aria-label={ariaLabel}
      onPress={onPress}
      className={cx(
        // The hit area reaches above and below the line so it's a comfortable target at every size.
        'relative inline-flex items-center gap-[.18em] rounded-[min(var(--radius-md),.4em)] px-[.22em] align-baseline leading-[1.05] whitespace-nowrap',
        "transition-[background-color,transform] duration-(--dur) data-[pressed]:scale-[.97] after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
        state === 'idle' &&
          'bg-(--control-fill) shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] data-[hovered]:bg-(--control-fill-hover)',
        (state === 'running' || state === 'paused') && 'bg-accent-soft tabular-nums',
        state === 'done' && 'bg-success-soft text-success',
      )}
    >
      <Icon
        name={icon}
        size=".72em"
        strokeWidth={2.4}
        className={cx('shrink-0', state === 'running' && 'text-accent-text', state === 'paused' && 'text-ink-muted')}
      />
      {children}
    </AriaButton>
  );
}
