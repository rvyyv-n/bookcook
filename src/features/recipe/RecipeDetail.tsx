import { useState, type ReactNode } from 'react';
import { Button as AriaButton, Disclosure, DisclosurePanel, Heading, Link as AriaLink } from 'react-aria-components';
import { useNavigate, useParams } from 'react-router';
import { useIsDesktop } from '../../app/useMediaQuery';
import { skinConfig } from '../../design/skin';
import { setRecipeCollections } from '../../db/collections';
import { addToGrocery } from '../../db/grocery';
import { metaLine } from './meta';
import { useCollections, useCookLogs, useForks, useRecipe, useRequestAnsweredBy, useSettings } from '../../db/hooks';
import { deleteRecipe, forkRecipe, restoreRecipe } from '../../db/recipes';
import type { Recipe } from '../../db/types';
import { useT } from '../../i18n';
import { printPage } from '../../lib/platform/print';
import { formatDay } from '../../lib/format';
import { AudioPlayer } from '../../ui/AudioPlayer';
import { Button, ButtonLink } from '../../ui/Button';
import { Chip } from '../../ui/Controls';
import { cx } from '../../ui/cx';
import { Icon, type IconName } from '../../ui/Icon';
import { Photo } from '../../ui/Photo';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { IngredientControls, IngredientList } from './IngredientsPanel';
import { shareRecipe } from './share';
import { useAdjustedIngredients } from './useAdjusted';

/**
 * phone: the handoff's phone detail, laid out by skin (hero, alignment, action style).
 * desk: the full desktop page, title and actions beside a 420px photo, then two columns.
 * pane: the desktop cookbook's right pane, a phone-style column with a desktop action row.
 */
type Layout = 'phone' | 'desk' | 'pane';
type Adjusted = ReturnType<typeof useAdjustedIngredients>;

interface Action {
  id: string;
  icon: IconName;
  label: string;
  short: string;
  onPress: () => void;
}

function useActions(recipe: Recipe, adj: Adjusted): Action[] {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const answered = useRequestAnsweredBy(recipe.id);
  const s = t.ui.recipe.short;
  return [
    { id: 'edit', icon: 'edit', label: t.ui.common.edit, short: s.edit, onPress: () => navigate(`/r/${recipe.id}/edit`) },
    {
      id: 'fork',
      icon: 'myVersion',
      label: t.ui.recipe.makeMyVersion,
      short: s.myVersion,
      onPress: async () => {
        const fork = await forkRecipe(recipe.id, settings.myName || recipe.author);
        toast.show({ message: t.ui.recipe.forked, tone: 'success' });
        navigate(`/r/${fork.id}/edit`);
      },
    },
    {
      id: 'grocery',
      icon: 'addToGrocery',
      label: t.ui.recipe.addToGrocery,
      short: s.grocery,
      onPress: async () => {
        await addToGrocery(adj.ingredients, recipe.id);
        toast.show({ message: t.ui.recipe.addedToGrocery(adj.ingredients.length), tone: 'success' });
      },
    },
    {
      id: 'share',
      icon: 'share',
      label: t.ui.recipe.share,
      short: s.share,
      onPress: async () => {
        if ((await shareRecipe(recipe, answered?.id, t)) === 'copied') toast.show({ message: t.ui.recipe.copied, tone: 'success' });
      },
    },
    { id: 'print', icon: 'print', label: t.ui.recipe.print, short: s.print, onPress: () => printPage(recipe.title) },
  ];
}

const outlined =
  'bg-(--control-fill) text-ink shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] transition-colors duration-(--dur) data-[hovered]:bg-(--control-fill-hover)';

/** The secondary actions, in the skin's layout: a 2-column grid, ruled rows, or round icons. */
function Actions({ actions, style }: { actions: Action[]; style: 'grid' | 'list' | 'iconRow' | 'row' }) {
  const t = useT();
  if (style === 'row')
    return actions.map((a) => (
      <AriaButton
        key={a.id}
        onPress={a.onPress}
        className={cx('inline-flex min-h-[4rem] items-center gap-1.5 rounded-md pr-4 pl-[.7rem] font-bold whitespace-nowrap', outlined)}
      >
        <Icon name={a.icon} className="shrink-0" />
        {a.short}
      </AriaButton>
    ));
  const cls = {
    grid: 'grid grid-cols-2 gap-2',
    list: 'flex flex-col border-t border-line-strong',
    iconRow: 'grid grid-cols-[repeat(auto-fit,minmax(3.6rem,1fr))] gap-x-1 gap-y-2',
  }[style];
  return (
    <div role="group" aria-label={t.ui.recipe.actions} className={cls}>
      {actions.map((a) =>
        style === 'grid' ? (
          <AriaButton
            key={a.id}
            onPress={a.onPress}
            className={cx('flex min-h-[3.5rem] items-center gap-2 rounded-md px-2.5 py-1.5 text-left leading-[1.15] font-bold', outlined)}
          >
            <Icon name={a.icon} className="shrink-0" />
            {a.label}
          </AriaButton>
        ) : style === 'list' ? (
          <AriaButton
            key={a.id}
            onPress={a.onPress}
            className="flex min-h-[3.5rem] items-center gap-3 border-b border-line px-1 text-left data-[hovered]:bg-sunk"
          >
            <Icon name={a.icon} className="shrink-0 text-accent-text" />
            <span className="flex-1 font-semibold">{a.label}</span>
            <Icon name="chevron" className="shrink-0 text-ink-muted" />
          </AriaButton>
        ) : (
          <AriaButton
            key={a.id}
            onPress={a.onPress}
            aria-label={a.label}
            className="group flex min-h-20 flex-col items-center gap-1.5 text-center text-[min(0.875rem,16px)] leading-[1.15] font-bold"
          >
            <span className="grid size-[3.5rem] place-items-center rounded-full bg-(--control-fill) transition-colors group-data-[hovered]:bg-(--control-fill-hover)">
              <Icon name={a.icon} />
            </span>
            {a.short}
          </AriaButton>
        ),
      )}
    </div>
  );
}

function StartCooking({ recipe, full }: { recipe: Recipe; full?: boolean }) {
  const t = useT();
  return (
    <ButtonLink
      href={`/r/${recipe.id}/cook`}
      variant="primary"
      size="XL"
      icon="startCooking"
      className={cx('text-lg', full ? 'w-full' : 'pr-[1.6rem] pl-[1.3rem]')}
    >
      {t.ui.recipe.startCooking}
    </ButtonLink>
  );
}

function BackButton({ floating }: { floating?: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <Button
      variant="quiet"
      icon="back"
      onPress={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'))}
      className={cx('pr-4 pl-[.7rem]', floating && 'absolute top-3.5 left-3 bg-surface! shadow-lift')}
    >
      {t.ui.common.back}
    </Button>
  );
}

function TagLinks({ tags, className }: { tags: string[]; className?: string }) {
  const t = useT();
  if (!tags.length) return null;
  return (
    <ul aria-label={t.ui.recipe.tags} className={cx('flex flex-wrap gap-x-3.5 gap-y-1 font-bold', className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <AriaLink
            href={`/t/${encodeURIComponent(tag)}`}
            className="text-accent-text underline underline-offset-2 data-[hovered]:text-ink"
          >
            {tag}
          </AriaLink>
        </li>
      ))}
    </ul>
  );
}

function Eyebrow({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const { myName } = useSettings();
  if (!recipe.author) return null;
  const mine = recipe.author === myName || recipe.author.toLowerCase() === 'me';
  return (
    <p className="type-eyebrow text-lg text-accent-text">{mine ? t.ui.common.fromMyKitchen : t.ui.common.fromKitchen(recipe.author)}</p>
  );
}

/** "Based on Mom's Pasta", a row on --sunk above Start cooking. */
function BasedOn({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const original = useRecipe(recipe.forkedFromId);
  if (!original) return null;
  return (
    <AriaLink
      href={`/r/${original.id}`}
      className="flex min-h-[4rem] items-center gap-3 rounded-[min(var(--radius-md),18px)] bg-sunk px-3.5 py-2.5 text-ink no-underline data-[hovered]:bg-line"
    >
      <Icon name="myVersion" className="shrink-0 text-accent-text" />
      <span className="flex-1">
        <span className="text-ink-muted">{t.ui.recipe.basedOn}</span> <b>{original.title}</b>
      </span>
      <Icon name="chevron" className="shrink-0" />
    </AriaLink>
  );
}

/** A section heading in the skin's style (Heirloom centres it in small caps over a rule). */
function SectionHeading({ id, children, desk, className }: { id: string; children: ReactNode; desk?: boolean; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <h2 id={id} className={cx('type-heading text-(length:--heading-size)', !desk && '[text-align:var(--heading-align)]')}>
        {children}
      </h2>
      {!desk && <span aria-hidden className="h-px bg-line-strong [display:var(--heading-rule)]" />}
    </div>
  );
}

/** The story, in the header under the title: the answer as a quiet quote, and its voice note. */
function StoryQuote({ recipe, center }: { recipe: Recipe; center?: boolean }) {
  const t = useT();
  if (!recipe.story?.length) return null;
  return (
    <section aria-label={t.ui.recipe.story} className={cx('flex flex-col gap-2 pt-1', center && 'items-center')}>
      {recipe.story.map((s, i) => (
        <figure key={i} className={cx('flex flex-wrap items-center gap-x-3 gap-y-2', center && 'justify-center')}>
          <figcaption className="sr-only">{s.prompt}</figcaption>
          <blockquote className="max-w-[40rem] font-(family-name:--font-display) text-lg leading-[1.35] font-normal italic">
            “{s.answer}”
          </blockquote>
          {s.audioId && (
            <AudioPlayer
              id={s.audioId}
              label={t.ui.recipe.voiceNote(i + 1)}
              playLabel={t.ui.recipe.play}
              pauseLabel={t.ui.recipe.pause}
              compact
              className="shrink-0"
            />
          )}
        </figure>
      ))}
    </section>
  );
}

function Ingredients({ adj, desk }: { adj: Adjusted; desk?: boolean }) {
  const t = useT();
  return (
    <section aria-labelledby="ing-h" className="flex flex-col gap-3">
      {desk ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1.5">
          <SectionHeading id="ing-h" desk>
            {t.ui.recipe.ingredients}
          </SectionHeading>
          <IngredientControls {...adj} showUnits={false} className="no-print" />
        </div>
      ) : (
        <>
          {/* Metric / Imperial sits beside the heading, where there's room, and drops below it when there isn't. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
            <SectionHeading id="ing-h" className="flex-1">
              {t.ui.recipe.ingredients}
            </SectionHeading>
            <IngredientControls {...adj} canScale={false} className="no-print" />
          </div>
          {adj.canScale && <IngredientControls {...adj} showUnits={false} className="no-print" />}
        </>
      )}
      <IngredientList ingredients={adj.ingredients} dense={desk} />
      {desk && <IngredientControls {...adj} canScale={false} className="no-print pt-3" />}
    </section>
  );
}

function Steps({ recipe, desk }: { recipe: Recipe; desk?: boolean }) {
  const t = useT();
  return (
    <section aria-labelledby="steps-h" className="flex flex-col gap-1.5">
      <SectionHeading id="steps-h" desk={desk}>
        {t.ui.recipe.steps}
      </SectionHeading>
      {!recipe.steps.length && <p className="text-ink-muted">{t.ui.recipe.noSteps}</p>}
      <ol className="flex flex-col">
        {recipe.steps.map((s, i) => (
          <li key={s.id} className="print-avoid-break grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-line py-3">
            <span aria-hidden className="type-display text-xl leading-[1.1] text-accent-text">
              {i + 1}
            </span>
            <div className="flex flex-col gap-3">
              <p className={desk ? undefined : 'text-lg leading-[1.4]'}>
                <span className="sr-only">{t.ui.recipe.step(i + 1)}: </span>
                {s.text}
              </p>
              {s.photoId && <Photo id={s.photoId} alt="" className="aspect-[4/3] w-full max-w-md rounded-[min(var(--radius-md),18px)]" />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "In her words": the transcript exactly as it was said, in the handwritten face. Closed until asked. */
function InHerWords({ transcript }: { transcript: string }) {
  const t = useT();
  return (
    <Disclosure className="group flex flex-col">
      <Heading>
        <AriaButton
          slot="trigger"
          className="flex min-h-[4rem] w-full items-center justify-between gap-2.5 rounded-[min(var(--radius-md),18px)] bg-sunk px-4 font-bold group-data-[expanded]:rounded-b-none"
        >
          <span className="flex items-center gap-2.5">
            <Icon name="transcript" className="shrink-0" />
            {t.ui.recipe.inHerWords}
          </span>
          <span className="flex items-center gap-1 text-ink-muted">
            <span className="group-data-[expanded]:hidden">{t.ui.common.show}</span>
            <span className="hidden group-data-[expanded]:inline">{t.ui.common.hide}</span>
            <Icon
              name="collapse"
              className="shrink-0 rotate-180 transition-transform duration-(--dur) ease-(--ease-out) group-data-[expanded]:rotate-0"
            />
          </span>
        </AriaButton>
      </Heading>
      {/* The height opens and closes with the panel: --disclosure-panel-height is React Aria's. */}
      <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip transition-[height] duration-(--dur) ease-(--ease-out)">
        <p className="type-handwritten rounded-b-[min(var(--radius-md),18px)] bg-sunk px-4.5 pt-3 pb-4 text-lg leading-[1.5]">
          {transcript}
        </p>
      </DisclosurePanel>
    </Disclosure>
  );
}

function OriginalCard({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  if (!recipe.originalCardPhotoIds.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold">{t.ui.recipe.originalCard}</span>
      {recipe.originalCardPhotoIds.map((id, i) => (
        <AriaButton key={id} onPress={() => setOpen(id)} aria-label={`${t.ui.recipe.originalCard} ${i + 1}`} className="rounded-sm">
          <Photo id={id} alt="" className="aspect-[4/3] w-full rounded-sm" />
        </AriaButton>
      ))}
      <Sheet isOpen={open !== null} onOpenChange={(o) => !o && setOpen(null)} title={t.ui.recipe.originalCard} size="lg">
        {open && <Photo id={open} alt={t.ui.recipe.originalCard} className="w-full rounded-[min(var(--radius-md),18px)] object-contain" />}
      </Sheet>
    </div>
  );
}

/** Tips, the transcript, voice notes and the original card. Hidden when there's none of them. */
function TipsAndSources({ recipe, desk }: { recipe: Recipe; desk?: boolean }) {
  const t = useT();
  const player = { playLabel: t.ui.recipe.play, pauseLabel: t.ui.recipe.pause };
  if (!recipe.tips && !recipe.tipsAudioId && !recipe.transcript && !recipe.voiceNoteIds.length && !recipe.originalCardPhotoIds.length)
    return null;
  return (
    <section aria-labelledby={recipe.tips ? 'tips-h' : undefined} className="flex flex-col gap-3.5">
      {(recipe.tips || recipe.tipsAudioId) && (
        <>
          <SectionHeading id="tips-h" desk={desk}>
            {t.ui.recipe.tips}
          </SectionHeading>
          {recipe.tips && <p className={cx('whitespace-pre-line', !desk && 'text-lg leading-[1.4]')}>{recipe.tips}</p>}
          {recipe.tipsAudioId && <AudioPlayer id={recipe.tipsAudioId} label={t.ui.recipe.tips} {...player} />}
        </>
      )}
      {recipe.transcript && <InHerWords transcript={recipe.transcript} />}
      {recipe.voiceNoteIds.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-bold">{t.ui.recipe.voiceNotes}</span>
          {recipe.voiceNoteIds.map((id, i) => (
            <AudioPlayer key={id} id={id} label={t.ui.recipe.voiceNote(i + 1)} {...player} />
          ))}
        </div>
      )}
      <OriginalCard recipe={recipe} />
    </section>
  );
}

/** "Made 12 times": date, rating and the note for next time. */
function CookLog({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const logs = useCookLogs(recipe.id);
  if (!logs?.length) return null;
  return (
    <section aria-labelledby="log-h" className="flex flex-col">
      <SectionHeading id="log-h">{t.ui.common.madeTimes(Math.max(recipe.cookedCount, logs.length))}</SectionHeading>
      <ul className="flex flex-col pt-2">
        {logs.map((l) => (
          <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-line py-3">
            <b>{formatDay(l.cookedAt)}</b>
            {l.rating ? (
              <span className="flex items-center gap-1 font-bold">
                <Icon name="star" size="1.2rem" filled className="text-accent-mark" />
                {t.ui.recipe.rating(l.rating)}
              </span>
            ) : (
              <span />
            )}
            {l.note && <span className="col-span-full text-ink-muted">{l.note}</span>}
            {l.photoId && <Photo id={l.photoId} alt="" className="col-span-full mt-2 size-24 rounded-sm" />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The quieter things at the end: other versions, collections, the source, and Delete. */
function More({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const forks = useForks(recipe.id);
  const collections = useCollections();
  return (
    <div className="no-print flex flex-col items-start gap-6 border-t border-line pt-6">
      {forks && forks.length > 0 && (
        <section aria-labelledby="versions-h" className="flex flex-col gap-2">
          <h2 id="versions-h" className="font-text text-base font-bold">
            {t.ui.recipe.versions}
          </h2>
          <ul className="flex flex-col gap-1">
            {forks.map((f) => (
              <li key={f.id}>
                <AriaLink href={`/r/${f.id}`} className="text-accent-text underline underline-offset-4">
                  {t.ui.recipe.versionBy(f.author || '…')}: {f.title}
                </AriaLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      {collections && collections.length > 0 && (
        <section aria-labelledby="col-h" className="flex flex-col gap-2.5">
          <h2 id="col-h" className="font-text text-base font-bold">
            {t.ui.recipe.collections}
          </h2>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => {
              const on = recipe.collectionIds.includes(c.id);
              return (
                <Chip
                  key={c.id}
                  isSelected={on}
                  onPress={() =>
                    setRecipeCollections(recipe.id, on ? recipe.collectionIds.filter((x) => x !== c.id) : [...recipe.collectionIds, c.id])
                  }
                >
                  {on && <Icon name="check" size="1.1rem" />}
                  {c.name}
                </Chip>
              );
            })}
          </div>
        </section>
      )}
      {recipe.sourceUrl && (
        <p className="text-ink-muted">
          {t.ui.recipe.source}:{' '}
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-accent-text underline underline-offset-4">
            {new URL(recipe.sourceUrl).hostname}
          </a>
        </p>
      )}
      <Button
        variant="destructive"
        onPress={async () => {
          const snap = await deleteRecipe(recipe.id);
          navigate('/');
          if (snap) toast.undo(t.ui.recipe.deleted(recipe.title), () => restoreRecipe(snap));
        }}
      >
        {t.ui.recipe.deleteRecipe}
      </Button>
    </div>
  );
}

/** Phone and pane: one column, laid out by skin. */
function ColumnView({ recipe, adj, pane }: { recipe: Recipe; adj: Adjusted; pane: boolean }) {
  const t = useT();
  const settings = useSettings();
  const actions = useActions(recipe, adj);
  const cfg = skinConfig[settings.skin];
  const photo = recipe.photoIds[0];
  const center = !pane && cfg.detailAlign === 'center';
  const meta = metaLine(recipe, t);

  return (
    <article data-recipe-id={recipe.id} className="flex flex-col pb-10">
      {photo ? (
        <div className="relative">
          <Photo
            id={photo}
            alt={recipe.title}
            className={cx('w-full', pane ? 'h-62.5' : 'h-[min(17.7778rem,288px)] [view-transition-name:recipe-photo]')}
          />
          {!pane && <BackButton floating />}
        </div>
      ) : (
        !pane && (
          <div className="px-2 pt-4">
            <BackButton />
          </div>
        )
      )}
      {/* On a phone the title sits on a sheet of paper drawn up over the photo, rounded to the skin. */}
      <div
        className={cx(
          pane ? 'px-8 pt-5.5' : 'px-5',
          !pane && (photo ? 'relative -mt-8 rounded-t-xl bg-paper bg-(image:--grain) pt-6.5' : 'pt-5.5'),
        )}
      >
        <div className={cx('flex flex-col gap-2', center && 'items-center text-center')}>
          <h1 className="text-3xl leading-[1.02] tracking-[-0.02em]">{recipe.title}</h1>
          <Eyebrow recipe={recipe} />
          {meta.length > 0 && <p className="text-ink-muted">{meta.join(' · ')}</p>}
          <TagLinks tags={recipe.tags} className={center ? 'justify-center' : undefined} />
          <StoryQuote recipe={recipe} center={center} />
        </div>
      </div>

      <div className={cx('no-print flex flex-col gap-3.5 pt-5.5', pane ? 'px-8' : 'px-5')}>
        <BasedOn recipe={recipe} />
        {pane ? (
          <div className="flex flex-wrap gap-2">
            <StartCooking recipe={recipe} />
            <Actions actions={actions} style="row" />
          </div>
        ) : (
          <>
            <StartCooking recipe={recipe} full />
            <Actions actions={actions} style={cfg.actions} />
          </>
        )}
      </div>

      <div className={cx('flex flex-col gap-7.5 pt-6.5', pane ? 'px-8' : 'px-5')}>
        <Ingredients adj={adj} />
        <Steps recipe={recipe} />
        <TipsAndSources recipe={recipe} />
        <CookLog recipe={recipe} />
        <More recipe={recipe} />
      </div>
    </article>
  );
}

/** Desktop page: title block and actions beside the photo, then ingredients beside the story and steps. */
function DeskView({ recipe, adj }: { recipe: Recipe; adj: Adjusted }) {
  const t = useT();
  const actions = useActions(recipe, adj);
  const photo = recipe.photoIds[0];
  const meta = metaLine(recipe, t);
  return (
    <article data-recipe-id={recipe.id} className="flex flex-col pb-12">
      <div className={cx('grid min-h-75', photo && 'grid-cols-[minmax(0,1fr)_420px]')}>
        <div className="flex flex-col justify-end gap-2.5 px-10 pt-9 pb-7">
          <Eyebrow recipe={recipe} />
          <h1 className="text-4xl leading-none tracking-[-0.025em]">{recipe.title}</h1>
          <div className="flex flex-wrap gap-x-1.5 text-ink-muted">
            {meta.length > 0 && <span>{meta.join(' · ')}</span>}
            {meta.length > 0 && recipe.tags.length > 0 && <span aria-hidden>·</span>}
            <TagLinks tags={recipe.tags} className="font-normal" />
          </div>
          <StoryQuote recipe={recipe} />
          <div className="no-print flex max-w-[48rem] flex-col gap-3 pt-3">
            <BasedOn recipe={recipe} />
            <div className="flex flex-wrap gap-2">
              <StartCooking recipe={recipe} />
              <Actions actions={actions} style="row" />
            </div>
          </div>
        </div>
        {photo && <Photo id={photo} alt={recipe.title} className="h-full min-h-75 w-full" />}
      </div>
      <div className="border-t border-line">
        <div className="grid max-w-[64rem] grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] gap-11 px-10 pt-7">
          <Ingredients adj={adj} desk />
          <div className="flex flex-col gap-4.5">
            <Steps recipe={recipe} desk />
            <TipsAndSources recipe={recipe} desk />
          </div>
        </div>
      </div>
      <div className="flex max-w-3xl flex-col gap-8 px-10 pt-10">
        <CookLog recipe={recipe} />
        <More recipe={recipe} />
      </div>
    </article>
  );
}

export function RecipeView({ recipe, layout }: { recipe: Recipe; layout?: Layout }) {
  const desktop = useIsDesktop();
  const adj = useAdjustedIngredients(recipe);
  const l: Layout = layout ?? (desktop ? 'desk' : 'phone');
  return l === 'desk' ? <DeskView recipe={recipe} adj={adj} /> : <ColumnView recipe={recipe} adj={adj} pane={l === 'pane'} />;
}

export function RecipeDetailPage() {
  const t = useT();
  const { id } = useParams();
  const recipe = useRecipe(id);
  if (recipe === undefined) return null;
  if (!recipe)
    return (
      <div className="flex flex-col items-start gap-4 px-5 py-10">
        <p className="type-display text-2xl">{t.ui.common.recipeNotFound}</p>
        <ButtonLink href="/" variant="secondary" icon="cookbook">
          {t.ui.common.goHome}
        </ButtonLink>
      </div>
    );
  return <RecipeView key={recipe.id} recipe={recipe} />;
}
