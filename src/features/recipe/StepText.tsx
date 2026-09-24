import { useMemo, type ReactNode } from 'react';
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import type { Ingredient } from '../../db/types';
import { useT } from '../../i18n';
import { formatIngredient } from '../../lib/parse/ingredient';
import { findMentions } from '../../lib/parse/mentions';
import { findDurations } from '../../lib/parse/timers';
import { TimerChip } from '../../ui/TimerChip';

interface Segment {
  text: string;
  ingredient?: Ingredient;
  seconds?: number;
}

function segments(text: string, ingredients: Ingredient[]): Segment[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const marks: { index: number; length: number; ingredient?: Ingredient; seconds?: number }[] = [
    ...findDurations(text).map((d) => ({ index: d.index, length: d.length, seconds: d.seconds })),
  ];
  for (const m of findMentions(text, ingredients)) {
    if (marks.some((x) => m.index < x.index + x.length && x.index < m.index + m.length)) continue;
    marks.push({ index: m.index, length: m.length, ingredient: byId.get(m.ingredientId) });
  }
  marks.sort((a, b) => a.index - b.index);
  const out: Segment[] = [];
  let last = 0;
  for (const m of marks) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: text.slice(m.index, m.index + m.length), ingredient: m.ingredient, seconds: m.seconds });
    last = m.index + m.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** An ingredient named in a step: highlighted, and tapping it shows the amount. */
function Mention({ ingredient, children }: { ingredient: Ingredient; children: ReactNode }) {
  const t = useT();
  return (
    <DialogTrigger>
      <AriaButton
        aria-label={`${children} – ${t.ui.recipe.amountOf(ingredient.name)}`}
        className="cursor-pointer rounded-sm bg-accent-soft/70 px-0.5 font-[inherit] text-[1em] underline decoration-accent-strong decoration-2 underline-offset-4 outline-none data-[hovered]:bg-accent-soft data-[focus-visible]:outline-3 data-[focus-visible]:outline-(--focus)"
      >
        {children}
      </AriaButton>
      <Popover
        placement="top"
        offset={10}
        className="max-w-xs rounded-lg bg-ink px-4 py-3 text-base text-paper shadow-lift data-[entering]:animate-rise"
      >
        <Dialog className="outline-none" aria-label={t.ui.recipe.amountOf(ingredient.name)}>
          <p className="font-bold">{formatIngredient(ingredient)}</p>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

/**
 * A step with ingredient mentions highlighted and durations shown as timer chips.
 * `ingredients` should already be scaled/converted so the amounts shown match the list.
 */
export function StepText({
  text,
  ingredients,
  onTimer,
  interactive = true,
}: {
  text: string;
  ingredients: Ingredient[];
  onTimer?: (seconds: number, label: string) => void;
  interactive?: boolean;
}) {
  const t = useT();
  const segs = useMemo(() => segments(text, ingredients), [text, ingredients]);
  return (
    <>
      {segs.map((s, i) => {
        if (s.seconds)
          return (
            <TimerChip
              key={i}
              seconds={s.seconds}
              text={s.text}
              label={onTimer ? t.ui.recipe.timerChip(s.text) : undefined}
              onPress={onTimer ? () => onTimer(s.seconds!, s.text) : undefined}
            />
          );
        if (s.ingredient && interactive)
          return (
            <Mention key={i} ingredient={s.ingredient}>
              {s.text}
            </Mention>
          );
        if (s.ingredient)
          return (
            <mark key={i} className="rounded-sm bg-accent-soft/70 px-0.5 text-ink">
              {s.text}
            </mark>
          );
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}
