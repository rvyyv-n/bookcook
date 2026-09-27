import { Button as AriaButton } from 'react-aria-components';
import { formatDuration } from '../lib/parse/timers';
import { cx } from './cx';
import { Icon } from './Icon';

const chip =
  'inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 align-baseline font-bold text-ink whitespace-nowrap ' +
  'text-[0.9em] leading-snug';

/** "⏱ 20 min" inline in a step. Pressable when it can start a timer or be edited. */
export function TimerChip({ seconds, text, onPress, label }: { seconds: number; text?: string; onPress?: () => void; label?: string }) {
  const content = (
    <>
      <Icon name="timer" size="1em" strokeWidth={2.2} />
      {text ?? formatDuration(seconds)}
    </>
  );
  if (!onPress) return <span className={chip}>{content}</span>;
  return (
    <AriaButton
      onPress={onPress}
      aria-label={label}
      className={cx(
        chip,
        'cursor-pointer border-2 border-transparent outline-none data-[hovered]:border-accent-strong data-[pressed]:scale-95',
        'data-[focus-visible]:outline-3 data-[focus-visible]:outline-focus',
      )}
    >
      {content}
    </AriaButton>
  );
}
