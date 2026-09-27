import type { ReactNode } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

/** A quiet button that opens a single-choice menu (the cookbook's sort). The button shows the current choice. */
export function ChoiceMenu<K extends string>({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  /** Accessible name of the menu, e.g. "Sort". */
  label: string;
  icon?: IconName;
  value: K;
  onChange: (value: K) => void;
  options: { id: K; label: ReactNode }[];
}) {
  const current = options.find((o) => o.id === value);
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={`${label}: ${typeof current?.label === 'string' ? current.label : value}`}
        className="inline-flex min-h-14 items-center gap-1.5 rounded-md px-[.6rem] font-bold text-ink transition-colors duration-(--dur) data-[hovered]:bg-sunk data-[pressed]:bg-line"
      >
        {icon && <Icon name={icon} className="shrink-0" />}
        {current?.label}
      </AriaButton>
      <Popover
        placement="bottom end"
        className="min-w-56 rounded-[min(var(--radius-md),18px)] bg-surface p-1.5 shadow-lift outline-none data-[entering]:animate-rise"
      >
        <Menu
          aria-label={label}
          selectionMode="single"
          selectedKeys={[value]}
          onAction={(k) => onChange(k as K)}
          className="flex flex-col outline-none"
        >
          {options.map((o) => (
            <MenuItem
              key={o.id}
              id={o.id}
              className={cx(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-sm px-3 text-ink outline-none',
                'data-[focused]:bg-sunk data-[selected]:font-bold',
              )}
            >
              {({ isSelected }) => (
                <>
                  <Icon name="check" className={cx('shrink-0', !isSelected && 'invisible')} />
                  {o.label}
                </>
              )}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
