import type { ReactNode } from 'react';
import { Button as AriaButton, Switch as AriaSwitch, ToggleButton } from 'react-aria-components';
import { Button } from './Button';
import { Spinner } from './Capture';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type MicState = 'idle' | 'listening' | 'processing' | 'disabled';

const disc = 'grid size-[6.6667rem] shrink-0 place-items-center rounded-full';

/**
 * BigMicButton: 120px, a single tap to toggle (never press-and-hold). idle is the accent disc with the
 * mic, listening breathes with the sound-wave glyph (`aria-pressed`), processing is a spinner around a
 * soft disc ("Writing it down"), disabled waits. The caption is always shown under or beside it.
 */
export function BigMicButton({
  state,
  label,
  ariaLabel,
  onToggle,
  side = false,
  children,
}: {
  state: MicState;
  /** The words under the mic: "Tap to talk", "Listening…". */
  label: string;
  ariaLabel: string;
  onToggle: () => void;
  /** Caption beside the mic instead of under it (desktop). */
  side?: boolean;
  /** Extra lines under the caption (the live transcript on desktop). */
  children?: ReactNode;
}) {
  const busy = state === 'processing' || state === 'disabled';
  const face =
    state === 'processing' ? (
      <span className={cx(disc, 'relative')}>
        <Spinner />
        <span className="grid size-[5.4rem] place-items-center rounded-full bg-accent-soft text-accent-text">
          <Icon name="listening" size="2.6rem" />
        </span>
      </span>
    ) : (
      <span
        className={cx(
          disc,
          'shadow-lift transition-colors duration-(--dur)',
          state === 'disabled' ? 'bg-sunk text-ink-muted' : 'bg-accent text-accent-ink group-data-[hovered]:bg-accent-strong',
          state === 'listening' && 'animate-breathe',
        )}
      >
        <Icon name={state === 'listening' ? 'listening' : 'mic'} size="3rem" />
      </span>
    );
  return (
    <div className={cx('flex items-center gap-3', side ? 'flex-row gap-5.5' : 'flex-col text-center')}>
      <ToggleButton
        isSelected={state === 'listening'}
        onChange={onToggle}
        isDisabled={busy}
        aria-label={ariaLabel}
        className="group rounded-full data-[pressed]:scale-[.97]"
      >
        {face}
      </ToggleButton>
      <span className={cx('flex flex-col gap-1.5', !side && 'items-center')}>
        <b className={side ? 'text-lg' : undefined}>{label}</b>
        {children}
      </span>
    </div>
  );
}

/** The mic is blocked: a dashed mic, the 3 steps to allow it, Try again (primary) and Type instead. */
export function MicBlocked({
  title,
  steps,
  retry,
  typeInstead,
  onRetry,
  onType,
}: {
  title: string;
  steps: readonly ReactNode[];
  retry: string;
  typeInstead: string;
  onRetry: () => void;
  onType: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <span className={cx(disc, 'border-2 border-dashed border-line-control text-ink-muted')}>
        <Icon name="micOff" size="3rem" />
      </span>
      <b className="text-lg">{title}</b>
      <ol className="flex max-w-[20rem] list-decimal flex-col gap-1.5 rounded-md bg-surface py-3.5 pr-4.5 pl-9 text-left shadow-paper">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="flex flex-wrap justify-center gap-2.5 pt-1.5">
        <Button variant="primary" icon="retry" onPress={onRetry}>
          {retry}
        </Button>
        <Button variant="secondary" icon="keyboard" onPress={onType}>
          {typeInstead}
        </Button>
      </div>
    </div>
  );
}

/** This browser can't hear: the keyboard on a sunk disc, why, and Type it as the primary action. */
export function NoSpeech({ title, body, action, onType }: { title: string; body: string; action: string; onType: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className={cx(disc, 'bg-sunk text-ink-muted')}>
        <Icon name="keyboard" size="3rem" />
      </span>
      <b className="text-lg">{title}</b>
      <p className="max-w-[18.75rem] text-ink-muted [text-wrap:pretty]">{body}</p>
      <Button variant="primary" size="XL" icon="keyboard" onPress={onType} className="mt-1.5">
        {action}
      </Button>
    </div>
  );
}

/** The live words: muted while being heard (`aria-live`). */
export function LiveWords({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p aria-live="polite" className={cx('max-w-[20rem] text-lg leading-[1.35] text-ink-muted [text-wrap:balance]', className)}>
      {children}
    </p>
  );
}

const controlClass = cx(
  'flex items-center justify-center rounded-md bg-(--control-fill) font-bold text-ink leading-[1.1] text-center',
  'shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] transition-[background-color,transform] duration-(--dur)',
  'data-[hovered]:bg-(--control-fill-hover) data-[pressed]:scale-[.97] data-[disabled]:text-ink-muted data-[disabled]:shadow-[inset_0_0_0_1px_var(--line)]',
);
const stackedClass = 'min-h-[4.2rem] flex-col gap-1 px-1 py-1.5';
const inlineClass = 'min-h-14 gap-2 pr-4 pl-3';

/** A small switch drawn inside the Hands-free control (the mock's toggle glyph). */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex h-[1.1rem] w-[1.9rem] shrink-0 items-center rounded-full p-[3px] transition-colors duration-(--dur)',
        on ? 'bg-accent-mark' : 'shadow-[inset_0_0_0_2px_var(--line-control)]',
      )}
    >
      <span
        className={cx(
          'size-[calc(1.1rem-6px)] rounded-full transition-transform duration-(--dur)',
          on ? 'translate-x-[.8rem] bg-accent-ink' : 'bg-(--line-control)',
        )}
      />
    </span>
  );
}

/** Hands-free: keep listening between answers. A `role="switch"`. */
export function HandsFreeSwitch({
  on,
  onChange,
  children,
  stacked = false,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    // A switch rather than a pressed button: it's a mode, like the settings switches.
    <AriaSwitch isSelected={on} onChange={onChange} className={cx(controlClass, 'cursor-pointer', stacked ? stackedClass : inlineClass)}>
      <span className="grid h-[1.9rem] place-items-center">
        <Toggle on={on} />
      </span>
      {children}
    </AriaSwitch>
  );
}

/** Undo last, Type instead: an icon over the label on phones, beside it on desktop. */
export function CaptureControl({
  icon,
  children,
  onPress,
  stacked = false,
  isDisabled,
}: {
  icon: IconName;
  children: ReactNode;
  onPress: () => void;
  stacked?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <AriaButton onPress={onPress} isDisabled={isDisabled} className={cx(controlClass, stacked ? stackedClass : inlineClass)}>
      <Icon name={icon} size="1.4444rem" className="shrink-0" />
      {children}
    </AriaButton>
  );
}

/** "Ingredients · step 4 of 7" over a thin bar (phone), or over one segment per question (desktop). */
export function TellProgress({
  label,
  current,
  total,
  segments = false,
}: {
  label: string;
  current: number;
  total: number;
  segments?: boolean;
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', segments ? 'items-center' : 'items-end')}>
      <b className={cx('leading-[1.15] whitespace-nowrap', !segments && 'text-right')}>{label}</b>
      {segments ? (
        <span aria-hidden className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${total}, 1.5556rem)` }}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cx('h-[5px] rounded-full', i + 1 < current ? 'bg-ink' : i + 1 === current ? 'bg-accent-mark' : 'bg-line')}
            />
          ))}
        </span>
      ) : (
        <span aria-hidden className="block h-[5px] w-[7.3333rem] overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-accent-mark" style={{ width: `${(current / total) * 100}%` }} />
        </span>
      )}
    </div>
  );
}

/** The card of rows heard so far ("For the marinade"): amount, then name; the newest row tinted. */
export function HeardRows({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cx('rounded-lg bg-surface px-4 pt-2.5 pb-1 shadow-paper', className)}>
      <span className="block pb-1 font-bold text-ink-muted">{label}</span>
      <ul>{children}</ul>
    </section>
  );
}

export function HeardRow({
  amount,
  name,
  isNew = false,
  check,
  wide = false,
}: {
  amount: string;
  name: string;
  isNew?: boolean;
  /** "Check this": the parser wasn't sure. */
  check?: string;
  wide?: boolean;
}) {
  return (
    <li
      className={cx(
        'grid min-h-14 items-center gap-3 py-1.5',
        wide ? 'grid-cols-[6rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,5rem)_minmax(0,1fr)_auto]',
        isNew ? '-mx-2.5 mt-1 rounded-sm bg-accent-soft px-2.5' : 'border-b border-line last:border-b-0',
      )}
    >
      <b>{amount}</b>
      <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
      {check ? (
        <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[0.8333rem] font-bold whitespace-nowrap text-accent-text">
          <Icon name="checkThis" size="1.1rem" />
          {check}
        </span>
      ) : (
        <span />
      )}
    </li>
  );
}

/** A step heard so far: the number in the display face, the text with its timer marked. The open step is ringed. */
export function HeardStep({ n, children, open = false }: { n: number; children: ReactNode; open?: boolean }) {
  return (
    <li
      className={cx(
        'grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2.5 rounded-lg bg-surface px-4 py-3.5',
        open ? 'shadow-[var(--shadow-paper),inset_0_0_0_2px_var(--accent-mark)]' : 'shadow-paper',
      )}
    >
      <span aria-hidden className="type-display text-xl leading-[1.1] text-accent-text">
        {n}
      </span>
      <span className="[text-wrap:pretty]">{children}</span>
    </li>
  );
}

/** A duration inside a heard step: "⏱ 30 min" on --sunk. */
export function HeardTimer({ children }: { children: ReactNode }) {
  return (
    <b className="inline-flex items-center gap-[3px] rounded-sm bg-sunk px-[.4em] whitespace-nowrap">
      <Icon name="timer" size="1.1rem" />
      {children}
    </b>
  );
}

/** An answer card: a muted label over the answer at body-lg ("Tip 1", "Name"). */
export function AnswerCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface p-4 shadow-paper">
      <span className="font-bold text-ink-muted">{label}</span>
      <span className="text-lg leading-[1.35] [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

/** The story answer in the display italic, with "Kept in your voice · 0:21" when a recording was kept. */
export function StoryHeard({ children, kept }: { children: ReactNode; kept?: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-lg bg-surface p-4.5 shadow-paper">
      <blockquote className="type-display text-xl leading-[1.22] italic [text-wrap:pretty]">{children}</blockquote>
      {kept && (
        <span className="flex items-center gap-2 text-ink-muted">
          <Icon name="listening" className="text-success" />
          {kept}
        </span>
      )}
    </div>
  );
}

/** "4:12 talking": the elapsed time in the display face, tabular, with a muted word. */
export function Elapsed({ time, word }: { time: string; word: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="type-display text-xl font-bold tabular-nums">{time}</span>
      <span className="text-ink-muted">{word}</span>
    </span>
  );
}

/** "What we heard": the running transcript in the handwritten face; the words still being heard are muted. */
export function HeardTranscript({
  label,
  text,
  partial,
  large = false,
  placeholder,
}: {
  label?: string;
  text: string;
  partial?: string;
  large?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-2.5 rounded-lg bg-surface shadow-paper', large ? 'px-7 py-6' : 'px-5 py-4.5')}>
      {label && <span className="font-bold text-ink-muted">{label}</span>}
      <p aria-live="polite" className={cx('type-handwritten leading-[1.45] [text-wrap:pretty]', large ? 'text-xl' : 'text-lg')}>
        {text}
        {partial && <span className="text-ink-muted"> {partial}</span>}
        {!text && !partial && placeholder && <span className="text-ink-muted">{placeholder}</span>}
      </p>
    </div>
  );
}
