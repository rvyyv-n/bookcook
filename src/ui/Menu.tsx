import type { ReactNode } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { TOPIC_ICONS, TopicIcon, type TopicIconName } from './TopicIcon';

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

/** A square button showing a collection's icon; it opens the list of icons to choose from. */
export function IconMenu({
  label,
  value,
  onChange,
  names,
}: {
  /** Accessible name, e.g. "Icon for Eid". */
  label: string;
  value: TopicIconName;
  onChange: (value: TopicIconName) => void;
  /** Visible name of each icon. */
  names: Record<TopicIconName, string>;
}) {
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={`${label}: ${names[value]}`}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text transition-colors duration-(--dur) data-[hovered]:bg-line"
      >
        <TopicIcon name={value} />
      </AriaButton>
      <Popover
        placement="bottom start"
        className="max-h-[min(24rem,var(--visible-height))] min-w-52 overflow-y-auto rounded-[min(var(--radius-md),18px)] bg-surface p-1.5 shadow-lift outline-none data-[entering]:animate-rise"
      >
        <Menu
          aria-label={label}
          selectionMode="single"
          selectedKeys={[value]}
          onAction={(k) => onChange(k as TopicIconName)}
          className="flex flex-col outline-none"
        >
          {TOPIC_ICONS.map((id) => (
            <MenuItem
              key={id}
              id={id}
              textValue={names[id]}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 text-ink outline-none data-[focused]:bg-sunk data-[selected]:font-bold"
            >
              <TopicIcon name={id} className="shrink-0" />
              {names[id]}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
