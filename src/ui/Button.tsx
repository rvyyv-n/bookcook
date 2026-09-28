import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  type ButtonProps as AriaButtonProps,
  type LinkProps as AriaLinkProps,
} from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

/** primary: the one accent action per screen. ink: a strong action on a tinted card (Continue, Tell it now). */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'ink';
/** L is 56px, XL is 64px. */
export type ButtonSize = 'L' | 'XL';

const base =
  'inline-flex items-center justify-center rounded-md font-bold text-center select-none ' +
  'transition-[background-color,transform] duration-(--dur) ease-(--ease-out) data-[pressed]:scale-[.97] ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted';

const variants: Record<ButtonVariant, string> = {
  primary: 'type-action bg-accent text-accent-ink data-[hovered]:bg-accent-strong data-[pressed]:bg-accent-strong data-[disabled]:bg-sunk',
  secondary:
    'bg-(--control-fill) text-ink shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] data-[hovered]:bg-(--control-fill-hover) ' +
    'data-[pressed]:bg-line data-[disabled]:bg-transparent data-[disabled]:shadow-[inset_0_0_0_1px_var(--line)]',
  quiet: 'bg-transparent text-ink data-[hovered]:bg-sunk data-[pressed]:bg-line',
  destructive:
    'bg-transparent text-danger shadow-[inset_0_0_0_1.5px_var(--danger)] data-[hovered]:bg-danger-soft data-[pressed]:bg-danger-soft ' +
    'data-[disabled]:bg-transparent data-[disabled]:shadow-[inset_0_0_0_1px_var(--line)]',
  ink: 'bg-ink text-paper data-[hovered]:opacity-90 data-[disabled]:bg-sunk',
};

const sizes: Record<ButtonSize, string> = {
  L: 'min-h-14 gap-2 px-[1rem]',
  XL: 'min-h-16 gap-[.6rem] px-[1.4rem] text-lg',
};

const iconSize: Record<ButtonSize, string> = { L: '1.3333rem', XL: '1.6rem' };

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'L', extra?: string) {
  // Primary labels use the skin's action size (the display face is larger in the Tin skins).
  const text = size === 'L' ? (variant === 'primary' ? 'text-(length:--action-size)' : 'text-base') : '';
  return cx(base, variants[variant], sizes[size], text, extra);
}

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  children: ReactNode;
  className?: string;
}

function Content({ icon, iconEnd, size = 'L', children }: Pick<Common, 'icon' | 'iconEnd' | 'size' | 'children'>) {
  return (
    <>
      {icon && <Icon name={icon} size={iconSize[size]} className="shrink-0" />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size={iconSize[size]} className="shrink-0" />}
    </>
  );
}

/** A button. The label is always shown; the icon is optional and decorative. */
export function Button({
  variant,
  size,
  icon,
  iconEnd,
  children,
  className,
  ...rest
}: Common & Omit<AriaButtonProps, 'children' | 'className'>) {
  return (
    <AriaButton {...rest} className={buttonClass(variant, size, className)}>
      <Content icon={icon} iconEnd={iconEnd} size={size}>
        {children}
      </Content>
    </AriaButton>
  );
}

/** A link that looks like a button (client-side navigation via the router provider). */
export function ButtonLink({
  variant,
  size,
  icon,
  iconEnd,
  children,
  className,
  ...rest
}: Common & Omit<AriaLinkProps, 'children' | 'className'>) {
  return (
    <AriaLink {...rest} className={buttonClass(variant, size, cx('no-underline', className))}>
      <Content icon={icon} iconEnd={iconEnd} size={size}>
        {children}
      </Content>
    </AriaLink>
  );
}
