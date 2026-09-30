import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  type Key,
  type ButtonProps,
} from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

/** A ruled settings row: bold label, the current value in muted text, a chevron. The whole row is the target. */
const rowBase =
  'relative isolate flex min-h-[3.5rem] w-full items-center gap-3 px-0.5 py-1.5 text-left text-base text-ink no-underline outline-none ' +
  // The hover / press / open tint is a rounded pill behind the row, so it matches the rest of the app's shapes.
  "before:absolute before:-inset-x-2 before:inset-y-1 before:-z-10 before:rounded-md before:bg-transparent before:transition-colors before:duration-(--dur) before:content-[''] " +
  'data-[hovered]:before:bg-sunk data-[pressed]:before:bg-line data-[open]:before:bg-sunk ' +
  'data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-focus data-[focus-visible]:rounded-md ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted';
const rowClass = `${rowBase} border-b border-line`;

function RowContent({
  icon,
  label,
  description,
  value,
}: {
  icon?: IconName;
  label: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
}) {
  return (
    <>
      {icon && <Icon name={icon} className="shrink-0" />}
      {description ? (
        <span className="flex flex-1 flex-col py-1">
          <span className="font-bold">{label}</span>
          <span className="text-[0.9375rem] text-ink-muted">{description}</span>
        </span>
      ) : (
        <span className="flex-1 font-bold">{label}</span>
      )}
      {value && <span className="min-w-0 text-right text-ink-muted">{value}</span>}
      <Icon name="chevron" className="shrink-0 text-ink-muted" />
    </>
  );
}

/** A row that opens something (a sheet) or goes somewhere (`href`). */
export function RowButton({
  icon,
  label,
  description,
  value,
  href,
  onPress,
  isDisabled,
  className,
}: {
  icon?: IconName;
  label: ReactNode;
  /** A line under the label, for a choice that needs explaining. */
  description?: ReactNode;
  value?: ReactNode;
  href?: string;
  onPress?: ButtonProps['onPress'];
  isDisabled?: boolean;
  className?: string;
}) {
  if (href)
    return (
      <AriaLink href={href} className={cx(rowClass, className)}>
        <RowContent icon={icon} label={label} description={description} value={value} />
      </AriaLink>
    );
  return (
    <AriaButton onPress={onPress} isDisabled={isDisabled} className={cx(rowClass, className)}>
      <RowContent icon={icon} label={label} description={description} value={value} />
    </AriaButton>
  );
}

/**
 * The row that opens and closes a fold (inside a React Aria Disclosure): label, a summary of what's
 * inside, and a chevron that turns. It's ruled only while open, when rows follow it.
 */
export function FoldRow({ label, value }: { label: ReactNode; value?: ReactNode }) {
  return (
    <AriaButton slot="trigger" className={cx(rowBase, 'in-data-[expanded]:border-b in-data-[expanded]:border-line')}>
      <span className="flex-1 font-bold">{label}</span>
      {value && <span className="min-w-0 text-right text-ink-muted">{value}</span>}
      <Icon
        name="chevron"
        className="shrink-0 rotate-90 text-ink-muted transition-transform duration-(--dur) in-data-[expanded]:-rotate-90"
      />
    </AriaButton>
  );
}

/** A row that picks one of several values from a list (Style, Voice). */
export function SelectRow<K extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: K;
  onChange: (v: K) => void;
  options: { id: K; label: string }[];
}) {
  return (
    <Select aria-label={label} value={value} onChange={(k: Key | null) => k !== null && onChange(k as K)}>
      <AriaButton className={rowClass}>
        <span className="flex-1 font-bold">{label}</span>
        <SelectValue className="min-w-0 text-right text-ink-muted" />
        <Icon
          name="chevron"
          className="shrink-0 rotate-90 text-ink-muted transition-transform duration-(--dur) in-data-[open]:-rotate-90"
        />
      </AriaButton>
      <Popover className="max-h-[60dvh] min-w-(--trigger-width) overflow-y-auto rounded-lg bg-surface p-1.5 shadow-lift data-[entering]:animate-rise data-[exiting]:animate-fade-out">
        <ListBox className="outline-none">
          {options.map((o) => (
            <ListBoxItem
              key={o.id}
              id={o.id}
              textValue={o.label}
              className="flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-md px-3 outline-none data-[focused]:bg-sunk data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-focus data-[focus-visible]:-outline-offset-3 data-[selected]:font-bold"
            >
              {({ isSelected }) => (
                <>
                  <span className="w-5 shrink-0">{isSelected && <Icon name="check" size={18} />}</span>
                  {o.label}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
