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
const rowClass =
  'flex min-h-14 w-full items-center gap-3 border-b border-line px-0.5 py-1.5 text-left text-base text-ink no-underline outline-none ' +
  'data-[hovered]:bg-sunk data-[pressed]:bg-line data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-focus';

function RowContent({ icon, label, value }: { icon?: IconName; label: ReactNode; value?: ReactNode }) {
  return (
    <>
      {icon && <Icon name={icon} className="shrink-0" />}
      <span className="flex-1 font-bold">{label}</span>
      {value && <span className="min-w-0 text-right text-ink-muted">{value}</span>}
      <Icon name="chevron" className="shrink-0 text-ink-muted" />
    </>
  );
}

/** A row that opens something (a sheet) or goes somewhere (`href`). */
export function RowButton({
  icon,
  label,
  value,
  href,
  onPress,
  className,
}: {
  icon?: IconName;
  label: ReactNode;
  value?: ReactNode;
  href?: string;
  onPress?: ButtonProps['onPress'];
  className?: string;
}) {
  if (href)
    return (
      <AriaLink href={href} className={cx(rowClass, className)}>
        <RowContent icon={icon} label={label} value={value} />
      </AriaLink>
    );
  return (
    <AriaButton onPress={onPress} className={cx(rowClass, className)}>
      <RowContent icon={icon} label={label} value={value} />
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
        <Icon name="chevron" className="shrink-0 rotate-90 text-ink-muted" />
      </AriaButton>
      <Popover className="max-h-[60dvh] min-w-(--trigger-width) overflow-y-auto rounded-lg bg-surface p-1.5 shadow-lift data-[entering]:animate-rise">
        <ListBox className="outline-none">
          {options.map((o) => (
            <ListBoxItem
              key={o.id}
              id={o.id}
              textValue={o.label}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-3 outline-none data-[focused]:bg-sunk data-[selected]:font-bold"
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
