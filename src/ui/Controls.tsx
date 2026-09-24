import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Checkbox as AriaCheckbox,
  Label,
  Switch as AriaSwitch,
  ToggleButton,
  ToggleButtonGroup,
  type CheckboxProps,
  type Key,
  type SwitchProps,
} from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

/** Segmented control: Metric / Imperial, text size, theme. */
export function Segmented<K extends string>({
  label,
  value,
  onChange,
  options,
  className,
  labelHidden,
}: {
  label: string;
  value: K;
  onChange: (value: K) => void;
  options: { id: K; label: ReactNode; icon?: IconName }[];
  className?: string;
  labelHidden?: boolean;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <span className={cx('font-bold', labelHidden && 'sr-only')} id={`seg-${label}`}>
        {label}
      </span>
      <ToggleButtonGroup
        aria-labelledby={`seg-${label}`}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys: Set<Key>) => {
          const [k] = [...keys];
          if (k !== undefined) onChange(k as K);
        }}
        className="inline-flex w-full rounded-full bg-sunk p-1"
      >
        {options.map((o) => (
          <ToggleButton
            key={o.id}
            id={o.id}
            className={cx(
              'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 font-bold text-ink-muted transition-colors outline-none',
              'data-[hovered]:text-ink data-[selected]:bg-surface data-[selected]:text-ink data-[selected]:shadow-paper',
              'data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)',
            )}
          >
            {o.icon && <Icon name={o.icon} size="1.15em" />}
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

/** − 4 + stepper for servings. */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  decrementLabel,
  incrementLabel,
  format = (n) => String(n),
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
  format?: (n: number) => ReactNode;
}) {
  const btn =
    'grid size-14 place-items-center rounded-full bg-surface border-2 border-line-strong text-ink outline-none transition-colors ' +
    'data-[hovered]:border-ink data-[pressed]:scale-95 data-[disabled]:opacity-40 data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)';
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="font-bold" aria-hidden>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <AriaButton
          aria-label={decrementLabel}
          className={btn}
          isDisabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Icon name="minus" />
        </AriaButton>
        <output aria-live="polite" className="min-w-10 text-center font-display-soft text-2xl tabular-nums">
          {format(value)}
        </output>
        <AriaButton
          aria-label={incrementLabel}
          className={btn}
          isDisabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Icon name="plus" />
        </AriaButton>
      </div>
    </div>
  );
}

export function Switch({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<SwitchProps, 'children' | 'className'>) {
  return (
    <AriaSwitch {...rest} className={cx('group flex min-h-14 cursor-pointer items-center justify-between gap-4 outline-none', className)}>
      <span className="flex-1">{children}</span>
      <span
        className={cx(
          'relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border-2 border-line-strong bg-sunk transition-colors',
          'group-data-[selected]:border-ink group-data-[selected]:bg-ink',
          'group-data-[focus-visible]:outline-3 group-data-[focus-visible]:outline-offset-2 group-data-[focus-visible]:outline-(--focus)',
        )}
      >
        <span className="ml-1 size-6 rounded-full bg-surface shadow-paper transition-transform duration-200 group-data-[selected]:translate-x-7 group-data-[selected]:bg-accent" />
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
        <Icon name="check" size={20} strokeWidth={3} className="opacity-0 group-data-[selected]:opacity-100" />
      </span>
      <span className="flex-1 transition-colors group-data-[selected]:text-ink-muted group-data-[selected]:line-through group-data-[selected]:decoration-2">
        {children}
      </span>
    </AriaCheckbox>
  );
}

/** A filter chip (collections, tags). */
export function Chip({
  isSelected,
  onPress,
  children,
  count,
}: {
  isSelected: boolean;
  onPress: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <AriaButton
      onPress={onPress}
      aria-pressed={isSelected}
      className={cx(
        'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-bold whitespace-nowrap transition-colors outline-none',
        'data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)',
        isSelected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink data-[hovered]:border-line-strong',
      )}
    >
      {children}
      {count !== undefined && <span className={cx('text-sm font-normal', isSelected ? 'text-paper/80' : 'text-ink-muted')}>{count}</span>}
    </AriaButton>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Label className="font-bold">{children}</Label>;
}
