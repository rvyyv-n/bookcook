import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Checkbox as AriaCheckbox,
  Label,
  Radio,
  RadioGroup,
  Switch as AriaSwitch,
  type CheckboxProps,
  type SwitchProps,
} from 'react-aria-components';
import { cx } from './cx';
import { Icon } from './Icon';

/**
 * Segmented control: one choice from a few (Metric / Imperial, text size, theme). A radio group.
 * L is the standard pill; XL is the taller pill used for text size.
 */
export function Segmented<K extends string>({
  label,
  value,
  onChange,
  options,
  size = 'L',
  className,
  labelHidden,
}: {
  label: string;
  value: K;
  onChange: (value: K) => void;
  options: { id: K; label: ReactNode; className?: string }[];
  size?: 'L' | 'XL';
  className?: string;
  labelHidden?: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onChange(v as K)}
      orientation="horizontal"
      className={cx('flex flex-col gap-1.5', className)}
    >
      <Label className={cx('font-bold', labelHidden && 'sr-only')}>{label}</Label>
      <div
        className={cx(
          'grid auto-cols-fr grid-flow-col p-1 bg-(--control-fill) shadow-[inset_0_0_0_1.5px_var(--line-strong)]',
          size === 'L' ? 'min-h-14' : 'min-h-16',
          'rounded-full',
        )}
      >
        {options.map((o) => (
          <Radio
            key={o.id}
            value={o.id}
            className={cx(
              'flex min-w-20 cursor-pointer items-center justify-center px-3 text-center leading-tight font-bold text-ink transition-colors duration-(--dur)',
              'data-[hovered]:bg-(--control-fill-hover) data-[selected]:bg-ink data-[selected]:text-paper',
              'rounded-full',
              o.className,
            )}
          >
            {o.label}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

/** The servings stepper: a 56px pill, "− 6 servings +". The value is announced as it changes. */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  decrementLabel,
  incrementLabel,
  format = (n) => String(n),
  compact = false,
  className,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
  format?: (n: number) => ReactNode;
  /** Just the number ("− 6 +"), as in cook mode. */
  compact?: boolean;
  className?: string;
}) {
  const btn =
    'grid size-14 shrink-0 place-items-center rounded-full text-ink transition-colors duration-(--dur) ' +
    'data-[hovered]:bg-(--control-fill-hover) data-[pressed]:bg-line data-[disabled]:text-ink-muted data-[disabled]:opacity-50';
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        'inline-flex min-h-14 items-center self-start rounded-full bg-(--control-fill) shadow-[inset_0_0_0_1.5px_var(--line-strong)]',
        className,
      )}
    >
      <AriaButton aria-label={decrementLabel} className={btn} isDisabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))}>
        <Icon name="remove" />
      </AriaButton>
      <output aria-live="polite" className={cx('text-center font-bold tabular-nums', compact ? 'min-w-[2.2rem]' : 'min-w-[5.4rem]')}>
        {format(value)}
      </output>
      <AriaButton aria-label={incrementLabel} className={btn} isDisabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))}>
        <Icon name="add" />
      </AriaButton>
    </div>
  );
}

/** A settings row with a 52×32 switch. The whole row is the target. */
export function Switch({
  children,
  description,
  className,
  ...rest
}: { children: ReactNode; description?: ReactNode; className?: string } & Omit<SwitchProps, 'children' | 'className'>) {
  return (
    <AriaSwitch
      {...rest}
      className={cx('group flex min-h-16 cursor-pointer items-center gap-3 border-b border-line px-0.5 py-1.5 text-ink', className)}
    >
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{children}</span>
        {description && <span className="text-[0.8889rem] text-ink-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          'flex h-8 w-13 shrink-0 items-center rounded-full p-0.75 shadow-[inset_0_0_0_2px_var(--line-control)] transition-colors duration-(--dur)',
          'group-data-[selected]:bg-accent group-data-[selected]:shadow-none',
          'group-data-[focus-visible]:outline-3 group-data-[focus-visible]:outline-offset-3 group-data-[focus-visible]:outline-focus',
        )}
      >
        <span className="size-6.5 rounded-full bg-(--line-control) transition-transform duration-(--dur) group-data-[selected]:translate-x-5 group-data-[selected]:bg-accent-ink" />
      </span>
    </AriaSwitch>
  );
}

/**
 * A checklist row: the whole ruled row is the target. Checking pops the box; checked rows are struck
 * through and muted. `dense` is the pinned cook-mode aside.
 */
export function CheckItem({
  children,
  className,
  dense = false,
  ...rest
}: { children: ReactNode; className?: string; dense?: boolean } & Omit<CheckboxProps, 'children' | 'className'>) {
  return (
    <AriaCheckbox
      {...rest}
      className={cx(
        'group flex cursor-pointer items-center border-b border-line px-0.5 text-ink outline-none data-[selected]:text-ink-muted',
        dense ? 'min-h-14 gap-3 py-1' : 'min-h-16 gap-3.5 py-1.5',
        className,
      )}
    >
      <span
        className={cx(
          'grid shrink-0 place-items-center rounded-[8px] shadow-[inset_0_0_0_2px_var(--line-control)]',
          'group-data-[selected]:animate-pop group-data-[selected]:bg-success group-data-[selected]:text-paper group-data-[selected]:shadow-none',
          'group-data-[focus-visible]:outline-3 group-data-[focus-visible]:outline-offset-3 group-data-[focus-visible]:outline-(--focus)',
          dense ? 'size-7' : 'size-7.5',
        )}
      >
        <Icon name="check" size={dense ? 20 : 22} current className="opacity-0 group-data-[selected]:opacity-100" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </AriaCheckbox>
  );
}

/**
 * The words of a checked item: a line draws through them from left to right and they fade to muted.
 * Inside a CheckItem. The line is a background, so it follows the text over wrapped lines.
 */
export function Struck({ children }: { children: ReactNode }) {
  return (
    <span
      className={cx(
        '[box-decoration-break:clone] bg-linear-to-r from-current to-current bg-position-[0_58%] bg-no-repeat [background-size:0%_2px]',
        'transition-[background-size,color] duration-(--dur) ease-(--ease-out)',
        'group-data-[selected]:text-ink-muted group-data-[selected]:[background-size:100%_2px]',
      )}
    >
      {children}
    </span>
  );
}

/** "How did it turn out?": five 56px stars, a radio group. */
export function StarRating({
  label,
  value,
  onChange,
  starLabel,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  starLabel: (n: number) => string;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value ? String(value) : null}
      onChange={(v) => onChange(Number(v))}
      orientation="horizontal"
      className="flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Radio
          key={n}
          value={String(n)}
          aria-label={starLabel(n)}
          className={cx(
            'grid size-14 cursor-pointer place-items-center rounded-full transition-transform duration-(--dur) data-[pressed]:scale-90',
            n <= value ? 'text-accent-mark' : 'text-line-control',
          )}
        >
          <Icon name="star" size="2.1rem" filled={n <= value} />
        </Radio>
      ))}
    </RadioGroup>
  );
}

/** A filter chip (collections): a 56px pill, ink when selected. `small` is the desktop list pane's 15px label. */
export function Chip({
  isSelected,
  onPress,
  children,
  small = false,
}: {
  isSelected: boolean;
  onPress: () => void;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <AriaButton
      onPress={onPress}
      aria-pressed={isSelected}
      className={cx(
        'inline-flex shrink-0 items-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors duration-(--dur)',
        small ? 'min-h-11 px-3.5 text-[0.8333rem]' : 'min-h-12 px-4 text-[0.8889rem]',
        isSelected
          ? 'bg-ink text-paper'
          : 'bg-(--control-fill) text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] data-[hovered]:bg-(--control-fill-hover)',
      )}
    >
      {children}
    </AriaButton>
  );
}
