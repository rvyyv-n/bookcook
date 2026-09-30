import type { ReactNode, Ref } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

/**
 * An empty page that explains itself: a sample of what will be here on a slightly turned sheet of
 * paper, the question the page answers, how it goes in three steps, and the page's action. The
 * sample and the text sit side by side on desktop.
 */
export function EmptyState({
  id,
  sampleLabel,
  sample,
  eyebrow,
  title,
  steps,
  action,
  headingLevel = 2,
  headingRef,
  className,
}: {
  id: string;
  sampleLabel: string;
  sample: ReactNode;
  eyebrow: string;
  title: string;
  steps: readonly { icon: IconName; title: string; body: string }[];
  action?: ReactNode;
  /** 1 when the empty state is the whole page (the cookbook), so its question is the page heading. */
  headingLevel?: 1 | 2;
  /** For moving focus to the heading, e.g. arriving from the welcome screen. */
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section
      aria-labelledby={id}
      className={cx(
        'flex animate-rise flex-col gap-7 pt-2 desk:grid desk:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] desk:items-center desk:gap-12',
        className,
      )}
    >
      {/* Two sheets of paper, the front one turned a little, like a note left on the counter. */}
      <figure aria-label={sampleLabel} className="relative mx-3 mt-2 desk:mx-0">
        <div aria-hidden className="absolute inset-0 rotate-[2.5deg] rounded-lg bg-sunk shadow-paper" />
        <div className="relative flex -rotate-[1.5deg] flex-col gap-3 rounded-lg bg-surface p-5 shadow-lift">
          <figcaption className="type-eyebrow text-accent-text">{sampleLabel}</figcaption>
          {sample}
        </div>
      </figure>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-lg text-accent-text">{eyebrow}</p>
          <Heading
            id={id}
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
            className={cx(
              'type-display leading-[1.1] text-balance outline-none',
              headingLevel === 1 ? 'text-3xl tracking-[-0.02em]' : 'text-2xl',
            )}
          >
            {title}
          </Heading>
        </div>
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex flex-col items-center gap-2 text-center">
              {/* A dotted thread from each step to the next. */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-6 left-[calc(50%+1.75rem)] w-[calc(100%-3rem)] border-t-2 border-dotted border-line-strong"
                />
              )}
              <span aria-hidden className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
                <Icon name={step.icon} size="1.4rem" />
              </span>
              <b className="leading-[1.2]">{step.title}</b>
              <span className="text-[0.875rem] leading-[1.3] text-ink-muted">{step.body}</span>
            </li>
          ))}
        </ol>
        {action}
      </div>
    </section>
  );
}
