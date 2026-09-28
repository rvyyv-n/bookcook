import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { cx } from './cx';
import { CheckNote } from './Editor';

/** A card on Check your recipe: surface, paper shadow, a muted bold label. */
export function ReviewCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cx('flex flex-col rounded-lg bg-surface px-4.5 py-3 shadow-paper', className)}>
      <h2 className="pb-0.5 font-(family-name:--font-body) text-base font-bold text-ink-muted [font-variation-settings:normal]">{label}</h2>
      {children}
    </section>
  );
}

/** A section heading inside the Ingredients card, with its spice dot when ingredient colours are on. */
export function ReviewSectionHeading({ children, spiceGroup, dense }: { children: ReactNode; spiceGroup?: number; dense?: boolean }) {
  return (
    <h3
      data-spice-group={spiceGroup}
      className={cx(
        'flex items-center gap-2 font-(family-name:--font-display) text-base font-bold text-(color:--sp-heading) [font-variation-settings:var(--font-display-settings)]',
        dense ? 'pt-2.5' : 'pt-3 pb-0.5',
      )}
    >
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--sp) [display:var(--sp-show)]" />
      {children}
    </h3>
  );
}

const amountGrid = 'grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)] items-baseline gap-x-3 text-left';

/**
 * One ingredient on Check your recipe: the amount in its own column, then the name. Tapping it edits it.
 * A row the parser was unsure of is tinted, with the reason under it ("Check this · heard “haldi”").
 */
export function ReviewIngredientRow({
  amount,
  name,
  check,
  label,
  onPress,
  dense,
}: {
  amount: string;
  name: ReactNode;
  check?: string;
  label: string;
  onPress: () => void;
  dense?: boolean;
}) {
  if (check)
    return (
      <AriaButton
        aria-label={`${label}. ${check}`}
        onPress={onPress}
        className={cx(
          amountGrid,
          'gap-y-1 rounded-sm bg-accent-soft text-ink',
          dense ? '-mx-2 my-0.75 w-[calc(100%+1rem)] px-2 py-1.75' : '-mx-2.5 my-1 w-[calc(100%+1.25rem)] p-2.5',
        )}
      >
        <b>{amount}</b>
        <span>{name}</span>
        <span className="col-start-2">
          <CheckNote>{check}</CheckNote>
        </span>
      </AriaButton>
    );
  return (
    <AriaButton
      aria-label={label}
      onPress={onPress}
      className={cx(amountGrid, 'border-b border-line data-[hovered]:bg-sunk', dense ? 'py-1.75' : 'min-h-[2.9rem] py-2.5')}
    >
      <b>{amount}</b>
      <span>{name}</span>
    </AriaButton>
  );
}

/** One step on Check your recipe: the numeral in accent text, then the step. Tapping it edits it. */
export function ReviewStepRow({ n, children, label, onPress }: { n: number; children: ReactNode; label: string; onPress: () => void }) {
  return (
    <AriaButton
      aria-label={label}
      onPress={onPress}
      className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2.5 border-b border-line py-2.5 text-left [text-wrap:pretty] data-[hovered]:bg-sunk"
    >
      <b className="text-accent-text">{n}</b>
      <span>{children}</span>
    </AriaButton>
  );
}

/** A tappable card body (Details, Tips, Story) that turns into fields when pressed. */
export function ReviewTap({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <AriaButton
      aria-label={label}
      onPress={onPress}
      className="-mx-1.5 flex flex-col gap-1.5 rounded-sm px-1.5 py-1 text-left data-[hovered]:bg-sunk"
    >
      {children}
    </AriaButton>
  );
}
