import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, type Key } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export function SelectField<K extends string>({
  label,
  value,
  onChange,
  options,
  icon,
  labelHidden,
  className,
}: {
  label: string;
  value: K;
  onChange: (v: K) => void;
  options: { id: K; label: string }[];
  icon?: IconName;
  labelHidden?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onChange={(k: Key | null) => k !== null && onChange(k as K)} className={cx('flex flex-col gap-1.5', className)}>
      <Label className={cx('font-bold', labelHidden && 'sr-only')}>{label}</Label>
      <Button
        className={cx(
          'inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-surface px-4 font-bold text-ink outline-none',
          'data-[hovered]:border-line-strong data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)',
        )}
      >
        {icon && <Icon name={icon} size="1.1em" />}
        {labelHidden && <span className="sr-only">{label}:</span>}
        <SelectValue className="flex-1 text-left whitespace-nowrap" />
        <Icon name="chevronDown" size="1.1em" />
      </Button>
      <Popover className="min-w-(--trigger-width) rounded-lg border border-line bg-surface p-1.5 shadow-lift data-[entering]:animate-rise">
        <ListBox className="outline-none">
          {options.map((o) => (
            <ListBoxItem
              key={o.id}
              id={o.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 outline-none data-[focused]:bg-sunk data-[selected]:font-bold"
            >
              {({ isSelected }) => (
                <>
                  <span className="w-5">{isSelected && <Icon name="check" size={18} />}</span>
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
