import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Button as AriaButton, Dialog, DialogTrigger, Popover, type ButtonProps } from 'react-aria-components';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { Photo } from './Photo';

// Cook mode's own parts: the step header, the listening indicator, pinned timers, the timer alert,
// ingredient mentions and the Back / Read / Next controls. Sizes follow the cook mock.

const displayBold = 'font-(family-name:--font-display) [font-variation-settings:var(--font-display-settings)] font-bold';

/** "Step 3 of 5" in the display face, following the skin's heading case. */
export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className={cx(displayBold, 'text-lg leading-none [font-variant-caps:var(--heading-case)] tracking-(--heading-tracking)')}>
      {children}
    </h1>
  );
}

/** One segment per step: done in ink, the current one in the accent, the rest as lines. */
export function StepBar({ current, total, className }: { current: number; total: number; className?: string }) {
  return (
    <div aria-hidden className={cx('grid gap-1.25', className)} style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx(
            'h-1.25 rounded-full transition-colors duration-(--dur) ease-(--ease-out)',
            i < current ? 'bg-ink' : i === current ? 'bg-accent-mark' : 'bg-line',
          )}
        />
      ))}
    </div>
  );
}

/** Spice Tin's header: a big numeral in the accent, with "of 5" and a dot per step beside it. */
export function StepNumeral({
  current,
  total,
  of,
  label,
  as: Tag = 'h1',
}: {
  current: number;
  total: number;
  of: string;
  label: string;
  /** The heading it is in cook mode; a div where the screen has its own heading. */
  as?: 'h1' | 'div';
}) {
  return (
    <Tag className="flex items-end gap-3">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        key={current}
        className="animate-numeral-in font-(family-name:--font-display) text-[5.7778rem] leading-[.78] font-extrabold text-accent-text [font-variation-settings:var(--font-display-settings)]"
      >
        {current + 1}
      </span>
      <span aria-hidden className="flex flex-col gap-2 font-(family-name:--font-body) text-base">
        <b className="leading-none">{of}</b>
        <span className="flex gap-1.25">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cx(
                'size-2.5 rounded-full transition-colors duration-(--dur) ease-(--ease-out)',
                i < current ? 'bg-ink' : i === current ? 'bg-accent-mark' : 'bg-line',
              )}
            />
          ))}
        </span>
      </span>
    </Tag>
  );
}

export type ListeningState = 'listening' | 'reading' | 'off' | 'heard';

/**
 * A pulse (or an icon) plus one word. The voice commands are never on screen: tapping the word shows
 * them in a small popover (the tooltip), which works by touch as well as by mouse and keyboard.
 */
export function ListeningIndicator({ state, word, hint }: { state: ListeningState; word: string; hint: string }) {
  const icon: IconName | undefined = state === 'reading' ? 'read' : state === 'off' ? 'micOff' : undefined;
  return (
    <DialogTrigger>
      <AriaButton
        className={cx(
          // The hit area reaches past the word so it's a comfortable target without moving the layout.
          "relative flex shrink-0 items-center gap-2 rounded-sm leading-none whitespace-nowrap text-ink-muted after:absolute after:-inset-x-3 after:-inset-y-[1.25rem] after:content-['']",
        )}
      >
        {icon ? (
          <Icon name={icon} size="1.2rem" />
        ) : (
          <span aria-hidden className="size-3.5 shrink-0 animate-breathe rounded-full bg-accent-mark" />
        )}
        {word}
      </AriaButton>
      <Popover
        placement="bottom end"
        offset={12}
        className="max-w-64 rounded-sm bg-ink px-3.5 py-2 font-bold text-paper shadow-lift data-[entering]:animate-rise data-[exiting]:animate-fade-out"
      >
        <Dialog aria-label={word} className="outline-none">
          {hint}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export type PinnedTimerState = 'running' | 'hot' | 'paused';

/** A running timer: its ring, name and time left. Pressing it pauses or resumes it. */
export function PinnedTimer({
  label,
  time,
  progress,
  state,
  ariaLabel,
  spiceGroup,
  onPress,
  wide = false,
  leaving = false,
}: {
  label: string;
  time: string;
  /** How much has gone, 0–1. */
  progress: number;
  state: PinnedTimerState;
  ariaLabel: string;
  spiceGroup?: number;
  onPress: () => void;
  wide?: boolean;
  /** Done or stopped: fades out where it was. */
  leaving?: boolean;
}) {
  const hot = state === 'hot';
  const paused = state === 'paused';
  const fill = paused ? 'var(--line-control)' : 'var(--timer-ring-fill)';
  return (
    <AriaButton
      data-spice-group={spiceGroup}
      aria-label={ariaLabel}
      onPress={onPress}
      style={{ '--disc': hot ? 'var(--timer-hot-bg)' : 'var(--timer-bg)' } as CSSProperties}
      className={cx(
        // Rises in when started; turning hot warms the colours more slowly than anything else moves.
        'flex min-h-19 min-w-0 items-center gap-2.5 rounded-md py-2 pl-2 text-left data-[pressed]:scale-[.98]',
        '[transition:transform_var(--dur)_var(--ease-out),background-color_400ms_var(--ease-out),color_400ms_var(--ease-out)]',
        leaving ? 'pointer-events-none animate-fade-out' : 'animate-rise',
        wide ? 'min-w-[12rem] pr-4' : 'pr-3',
        hot
          ? 'bg-(--timer-hot-bg) text-(color:--timer-hot-fg)'
          : cx('bg-(--timer-bg) [box-shadow:var(--timer-shadow)]', paused ? 'text-ink-muted' : 'text-ink'),
      )}
    >
      <span
        aria-hidden
        className="grid size-(--timer-ring) shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${fill} 0 ${Math.round(progress * 100)}%, var(--timer-ring-track) 0)` }}
      >
        <span className="grid size-[76%] place-items-center rounded-full bg-(--timer-disc)">
          {/* Keyed so the alarm arrives with a single pop. */}
          <span key={hot ? 'hot' : 'cool'} className={cx('grid place-items-center', hot && 'animate-pop')}>
            <Icon name={paused ? 'pause' : hot ? 'alarm' : 'timer'} size="1.4444rem" />
          </span>
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.75">
        <b className="leading-none text-(color:--sp-heading)">{label}</b>
        <span className={cx(displayBold, 'text-xl leading-none tabular-nums [font-variant-numeric:tabular-nums_lining-nums]')}>{time}</span>
      </span>
    </AriaButton>
  );
}

/** A finished timer: a full-width accent alert with +1 min and Stop. */
export function TimerAlert({
  title,
  detail,
  addLabel,
  stopLabel,
  onAdd,
  onStop,
}: {
  title: string;
  detail?: string;
  addLabel: string;
  stopLabel: string;
  onAdd: () => void;
  onStop: () => void;
}) {
  const btn = 'min-h-[3.5rem] rounded-md font-bold transition-transform duration-(--dur) data-[pressed]:scale-[.97]';
  return (
    <div
      role="alert"
      className="flex animate-rise flex-wrap items-center gap-x-3.5 gap-y-3 rounded-lg bg-accent pt-4 pr-3.5 pb-3.5 pl-4.5 text-accent-ink shadow-lift"
    >
      <Icon name="alarm" size="2.2rem" className="shrink-0" />
      <span className="flex flex-[1_1_150px] flex-col gap-0.5">
        <b className={cx(displayBold, 'text-xl leading-[1.1]')}>{title}</b>
        {detail && <span>{detail}</span>}
      </span>
      <span className="grid flex-[1_1_100%] grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
        <AriaButton onPress={onAdd} className={cx(btn, 'shadow-[inset_0_0_0_1.5px_var(--accent-ink)]')}>
          {addLabel}
        </AriaButton>
        <AriaButton onPress={onStop} className={cx(btn, 'bg-accent-ink text-accent')}>
          {stopLabel}
        </AriaButton>
      </span>
    </div>
  );
}

/** Closes the mention's amount after 4 seconds. */
function AutoClose({ close }: { close: () => void }) {
  useEffect(() => {
    const id = setTimeout(close, 4000);
    return () => clearTimeout(id);
  }, [close]);
  return null;
}

/** How an ingredient named in step text looks, from the skin's mention tokens (cook mode and the editor). */
export const mentionClass = cx(
  'text-(color:--mention-fg) [background:var(--mention-bg)] [font-style:var(--mention-style)] rounded-(--mention-radius) [padding:var(--mention-pad)]',
  'underline decoration-(color:--mention-line) [text-decoration-style:var(--mention-line-style)] [text-decoration-thickness:var(--mention-line-width)] underline-offset-[.2em]',
  '[box-decoration-break:clone] [-webkit-box-decoration-break:clone]',
);

/**
 * An ingredient named in a step, styled by the skin's mention tokens. Tapping it shows the amount
 * (already scaled) in an ink chip below; it closes on the next tap, on Esc, or after 4 seconds.
 */
export function Mention({
  children,
  label,
  amount,
  spiceGroup,
}: {
  children: ReactNode;
  /** "chicken, 1 kg" */
  label: string;
  /** "1 kg chicken, bone-in" */
  amount: string;
  spiceGroup?: number;
}) {
  return (
    <DialogTrigger>
      <AriaButton data-spice-group={spiceGroup} aria-label={label} className={cx('inline cursor-pointer leading-none', mentionClass)}>
        {children}
      </AriaButton>
      <Popover
        placement="bottom start"
        offset={8}
        className="rounded-sm bg-ink px-[.9rem] py-2 text-base font-bold whitespace-nowrap text-paper shadow-lift data-[entering]:animate-rise data-[exiting]:animate-fade-out"
      >
        <Dialog aria-label={label} className="outline-none">
          {({ close }) => (
            <>
              <AutoClose close={close} />
              {amount}
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

/** "It should look like this" beside the step's photo. */
export function StepPhoto({ id, caption, wide = false }: { id: string; caption: string; wide?: boolean }) {
  return (
    <div className={cx('flex items-center', wide ? 'gap-4' : 'gap-3.5')}>
      <Photo id={id} alt="" className={cx('shrink-0 rounded-sm', wide ? 'h-22.5 w-30' : 'h-16 w-21')} />
      <span className="text-ink-muted">{caption}</span>
    </div>
  );
}

function CookButton({
  icon,
  children,
  primary = false,
  wide,
  ...rest
}: { icon: IconName; children: ReactNode; primary?: boolean; wide: boolean } & Omit<ButtonProps, 'children' | 'className'>) {
  return (
    <AriaButton
      {...rest}
      className={cx(
        'flex min-h-19 min-w-0 items-center justify-center rounded-md leading-[1.1] transition-[background-color,transform] duration-(--dur) data-[pressed]:scale-[.97]',
        wide ? 'flex-row gap-2' : '[flex-direction:var(--cook-btn-direction)] gap-x-1.5 gap-y-1',
        primary
          ? 'type-action bg-accent text-(length:--action-size) text-accent-ink data-[hovered]:bg-accent-strong'
          : 'bg-(--control-fill) text-base font-bold text-ink shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] data-[hovered]:bg-(--control-fill-hover) data-[disabled]:text-ink-muted',
      )}
    >
      <Icon name={icon} size="1.4444rem" className="shrink-0" />
      <span>{children}</span>
    </AriaButton>
  );
}

/** Back · Read (Stop while speaking) · Next (I made it on the last step). Back and Read are equal; Next is 1.5×. */
export function CookControls({
  labels,
  reading,
  isFirst,
  isLast,
  onBack,
  onRead,
  onNext,
  wide = false,
  className,
}: {
  labels: { back: string; read: string; stop: string; next: string; madeIt: string };
  reading: boolean;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onRead: () => void;
  onNext: () => void;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]', wide ? 'gap-2.5' : 'gap-2', className)}>
      <CookButton icon="back" wide={wide} isDisabled={isFirst} onPress={onBack}>
        {labels.back}
      </CookButton>
      <CookButton icon={reading ? 'stop' : 'read'} wide={wide} aria-pressed={reading} onPress={onRead}>
        {reading ? labels.stop : labels.read}
      </CookButton>
      <CookButton icon={isLast ? 'madeIt' : 'next'} wide={wide} primary onPress={onNext}>
        {isLast ? labels.madeIt : labels.next}
      </CookButton>
    </div>
  );
}
