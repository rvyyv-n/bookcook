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
 * L is the 56px pill; XL is the 64px row used for text size.
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
  const round = size === 'L' ? 'rounded-full' : 'rounded-md';
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
          round,
        )}
      >
        {options.map((o) => (
          <Radio
            key={o.id}
            value={o.id}
            className={cx(
              'flex min-w-20 cursor-pointer items-center justify-center px-3 text-center leading-tight font-bold text-ink transition-colors duration-(--dur)',
              'data-[hovered]:bg-(--control-fill-hover) data-[selected]:bg-ink data-[selected]:text-paper',
              round,
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
      <output aria-live="polite" className="min-w-[5.4rem] text-center font-bold tabular-nums">
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

/** Checklist item with a satisfying check. */
export function CheckItem({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<CheckboxProps, 'children' | 'className'>) {
  return (
    <AriaCheckbox {...rest} className={cx('group flex min-h-14 cursor-pointer items-center gap-4 py-2 outline-none', className)}>
      <span
        className={cx(
          'grid size-8 shrink-0 place-items-center rounded-md border-2 border-line-strong bg-surface transition-colors',
          'group-data-[selected]:animate-pop group-data-[selected]:border-success group-data-[selected]:bg-success group-data-[selected]:text-paper',
          'group-data-[focus-visible]:outline-3 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-(--focus)',
        )}
      >
        <Icon name="check" size={20} current className="opacity-0 group-data-[selected]:opacity-100" />
      </span>
      <span className="flex-1 transition-colors group-data-[selected]:text-ink-muted group-data-[selected]:line-through group-data-[selected]:decoration-2">
        {children}
      </span>
    </AriaCheckbox>
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
        'inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors duration-(--dur)',
        small ? 'px-4 text-[0.8889rem]' : 'px-[1.1rem] text-base',
        isSelected
          ? 'bg-ink text-paper'
          : 'bg-(--control-fill) text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] data-[hovered]:bg-(--control-fill-hover)',
      )}
    >
      {children}
    </AriaButton>
  );
}
