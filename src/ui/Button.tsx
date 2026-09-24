import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Link as AriaLink,
  type ButtonProps as AriaButtonProps,
  type LinkProps as AriaLinkProps,
} from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'ink';
export type ButtonSize = 'md' | 'lg' | 'xl';

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-full font-bold select-none text-center ' +
  'transition-[background-color,box-shadow,transform,color] duration-150 ease-out ' +
  'data-[pressed]:scale-[0.97] data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed ' +
  'outline-none data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-(--focus)';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink shadow-paper data-[hovered]:bg-accent-strong',
  secondary: 'bg-surface text-ink border-2 border-line-strong data-[hovered]:border-ink',
  quiet: 'bg-transparent text-ink data-[hovered]:bg-sunk',
  danger: 'bg-transparent text-danger border-2 border-danger/40 data-[hovered]:bg-danger-soft',
  ink: 'bg-ink text-paper data-[hovered]:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-14 px-5 text-base',
  lg: 'min-h-16 px-7 text-lg',
  xl: 'min-h-20 px-8 text-xl',
};

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string) {
  return cx(base, variants[variant], sizes[size], extra);
}

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  children: ReactNode;
  className?: string;
}

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
      {icon && <Icon name={icon} size="1.25em" />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size="1.25em" />}
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
      {icon && <Icon name={icon} size="1.25em" />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size="1.25em" />}
    </AriaLink>
  );
}

/** A compact labelled icon button (label always visible, stacked or inline). */
export function ToolButton({
  icon,
  children,
  className,
  stacked = false,
  ...rest
}: { icon: IconName; children: ReactNode; className?: string; stacked?: boolean } & Omit<AriaButtonProps, 'children' | 'className'>) {
  return (
    <AriaButton
      {...rest}
      className={cx(
        'inline-flex min-h-14 min-w-14 items-center justify-center rounded-lg px-3 font-bold text-ink transition-colors outline-none',
        'data-[hovered]:bg-sunk data-[pressed]:bg-line data-[disabled]:opacity-45',
        'data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)',
        stacked ? 'flex-col gap-1 text-sm' : 'gap-2 text-base',
        className,
      )}
    >
      <Icon name={icon} size={stacked ? 26 : '1.25em'} />
      <span>{children}</span>
    </AriaButton>
  );
}
