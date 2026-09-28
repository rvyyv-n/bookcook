import type { ReactNode, Ref } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { SaveBar } from './Editor';

// The first-run welcome: the full-screen frame, and the small parts its steps are made of.

/** The logo and wordmark, as in the sidebar. */
export function Wordmark({ name }: { name: string }) {
  return (
    <span className="type-display flex items-center gap-2.5 text-xl leading-none text-ink">
      <Logo variant="rice" className="size-9 shrink-0 dark:hidden" />
      <Logo variant="dark" className="hidden size-9 shrink-0 dark:block" />
      {name}
    </span>
  );
}

/**
 * The frame: a top bar (Back · progress · Skip), the step in a column, and the primary button in a
 * sticky bar on a phone or under the content on desktop. The colour-field skin puts it all on the field.
 */
export function OnboardingFrame({
  desktop,
  field,
  centre,
  left,
  centreSlot,
  right,
  wide = false,
  primary,
  children,
}: {
  desktop: boolean;
  field: boolean;
  centre: boolean;
  left: ReactNode;
  centreSlot: ReactNode;
  right: ReactNode;
  wide?: boolean;
  primary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-surface={field ? 'field' : undefined} className="flex min-h-dvh flex-col bg-paper bg-(image:--grain) text-ink">
      <header
        className={cx(
          'grid grid-cols-[1fr_auto_1fr] items-center gap-2',
          desktop ? 'px-8 py-5' : 'pt-[max(.5rem,env(safe-area-inset-top))] pr-3 pl-2',
        )}
      >
        <div className="justify-self-start">{left}</div>
        <div className="min-w-0">{centreSlot}</div>
        <div className="justify-self-end">{right}</div>
      </header>
      <main className="flex flex-1 flex-col px-5 desk:px-8">
        {/* Free space above and below: a third of the way down when the step fits, from the top when it doesn't. */}
        <div className="flex-1" />
        <div
          className={cx(
            'mx-auto flex w-full flex-col gap-6 py-6',
            wide ? 'max-w-[64rem]' : 'max-w-[40rem]',
            centre && 'items-center text-center',
          )}
        >
          {children}
          {desktop && <div className={cx('flex flex-wrap items-center gap-4 pt-2', centre && 'justify-center')}>{primary}</div>}
        </div>
        <div className={desktop ? 'flex-1' : 'flex-2'} />
      </main>
      {!desktop && <SaveBar>{primary}</SaveBar>}
    </div>
  );
}

/** "Step 2 of 3" over a bar of segments, or just the words. The bar is decoration. */
export function OnboardingProgress({ label, bar }: { label: string; bar?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <b className="leading-[1.15] whitespace-nowrap">{label}</b>
      {bar}
    </div>
  );
}

/** A step's heading. Focus moves to it when the step changes, so a screen reader announces the new step. */
export function OnboardingHeading({
  ref,
  size = '3xl',
  children,
}: {
  ref?: Ref<HTMLHeadingElement>;
  size?: '3xl' | '2xl';
  children: ReactNode;
}) {
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={cx('leading-[1.05] tracking-[-0.02em] text-balance outline-none', size === '3xl' ? 'text-3xl' : 'text-2xl')}
    >
      {children}
    </h1>
  );
}

/** One thing voice does: an icon disc, a bold title and one muted line. It explains; it isn't a button. */
export function FeatureRow({
  icon,
  title,
  body,
  spiceGroup,
}: {
  icon: IconName;
  title: string;
  body: string;
  /** With ingredient colours on, the disc takes that spice colour instead of the accent. */
  spiceGroup?: number;
}) {
  return (
    <li className="flex items-start gap-4 text-left" data-spice-group={spiceGroup}>
      <span
        className={cx(
          'grid size-[3.3333rem] shrink-0 place-items-center rounded-full',
          spiceGroup ? 'bg-sp-soft text-sp' : 'bg-accent-soft text-accent-text',
        )}
      >
        <Icon name={icon} size="1.6rem" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <b className="text-lg leading-[1.15]">{title}</b>
        <span className="text-ink-muted [text-wrap:pretty]">{body}</span>
      </span>
    </li>
  );
}

/** The rows sit three across on a wide screen and stack when there's no room, or at large text. */
export function FeatureList({ children }: { children: ReactNode }) {
  return <ul className="grid w-full gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">{children}</ul>;
}
