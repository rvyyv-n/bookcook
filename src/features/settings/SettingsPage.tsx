import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button as AriaButton, Disclosure, DisclosurePanel, Heading, Link } from 'react-aria-components';
import { ShortcutList } from '../../app/shortcuts';
import { useAppUpdate } from '../../app/update';
import { useIsDesktop } from '../../app/useMediaQuery';
import { useSettings } from '../../db/hooks';
import { setSetting, setSkin, type Accent, type Skin, type Theme } from '../../db/settings';
import { SKIN_LABELS, SKINS, skinConfig } from '../../design/skin';
import { useT } from '../../i18n';
import { Segmented, Switch } from '../../ui/Controls';
import { TextSizeSegmented } from './TextSizeSegmented';
import { TextField } from '../../ui/Field';
import { cx } from '../../ui/cx';
import { Icon, type IconName } from '../../ui/Icon';
import { RowButton, SelectRow } from '../../ui/Rows';
import { Sheet } from '../../ui/Sheet';
import { BackupCard } from './Backup';
import { SpeechSettings } from './SpeechSettings';

type SectionId = 'text' | 'look' | 'voice' | 'people' | 'cookbook' | 'app';

/** A group of settings: a heading, then its rows on one card. */
function Section({ id, title, children }: { id: SectionId; title: ReactNode; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="flex scroll-mt-6 flex-col gap-2.5">
      <h2 id={`settings-${id}-title`} tabIndex={-1} className="type-heading px-1 text-lg outline-none">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The card the rows sit on. Rows are ruled between each other, not under the last one. */
const cardClass = 'flex flex-col rounded-lg bg-surface px-4 shadow-paper [&>*:last-child]:border-b-0';

/** The text-size control and a cook step to judge by. */
function TextSizeSection() {
  const ts = useT().ui.settings;
  return (
    <Section id="text" title={ts.textSize}>
      <div className={cx(cardClass, 'gap-4 py-4')}>
        <TextSizeSegmented label={ts.textSize} />
        <p className="type-step rounded-md bg-sunk px-4 py-3.5 text-xl leading-[1.2] text-pretty" aria-live="polite">
          {ts.textPreview}
        </p>
      </div>
    </Section>
  );
}

function LookSection() {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <Section id="look" title={ts.look}>
      <div className={cardClass}>
        <Segmented<Theme>
          label={ts.theme}
          labelHidden
          className="border-b border-line py-4"
          value={s.theme}
          onChange={(v) => setSetting('theme', v)}
          options={(['light', 'dark', 'system'] as const).map((id) => ({ id, label: ts.themes[id] }))}
        />
        <SelectRow<Skin>
          label={ts.style}
          value={s.skin}
          onChange={(v) => setSkin(v)}
          options={SKINS.map((id) => ({ id, label: SKIN_LABELS[id] }))}
        />
        {skinConfig[s.skin].accentLocked ? (
          <div className="flex min-h-[3.5rem] items-center gap-3 border-b border-line px-0.5 py-1.5">
            <span className="flex-1 font-bold">{ts.accent}</span>
            <span className="text-ink-muted">{ts.accentFixed}</span>
          </div>
        ) : (
          <SelectRow<Accent>
            label={ts.accent}
            value={s.accent}
            onChange={(v) => setSetting('accent', v)}
            options={(['tomato', 'saffron'] as const).map((id) => ({ id, label: ts.accents[id] }))}
          />
        )}
        <Switch isSelected={s.spiceColours} onChange={(v) => setSetting('spiceColours', v)} description={ts.spiceColoursHint}>
          {ts.spiceColours}
        </Switch>
        <Switch isSelected={s.stepPhoto} onChange={(v) => setSetting('stepPhoto', v)} description={ts.stepPhotosHint}>
          {ts.stepPhotos}
        </Switch>
      </div>
    </Section>
  );
}

/** Check for updates: web versions swap in place; the Android app downloads the new APK. */
const GITHUB_USER = 'rvyyv-n';
const external = 'text-accent-text underline underline-offset-4 data-[hovered]:text-ink';

/** The small print at the bottom: the version, and where the code and its maker live. */
function AboutApp() {
  const ts = useT().ui.settings;
  return (
    <footer aria-label={ts.about} className="flex flex-col gap-1.5 px-1 text-ink-muted">
      <p>{ts.aboutLine(__APP_VERSION__)}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1.5">
        <Link href={`https://github.com/${GITHUB_USER}/bookcook`} target="_blank" rel="noreferrer noopener" className={external}>
          {ts.sourceCode}
        </Link>
        <span>
          {ts.madeBy}{' '}
          <Link href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer noopener" className={external}>
            @{GITHUB_USER}
          </Link>
        </span>
      </p>
    </footer>
  );
}

function UpdateRow() {
  const t = useT();
  const ts = t.ui.settings;
  const update = useAppUpdate();
  const ready = update.status === 'ready';
  const status = ts.updateStatus[update.status] || ts.version(__APP_VERSION__);
  return (
    <>
      <p aria-live="polite" className="sr-only">
        {ts.updateStatus[update.status]}
      </p>
      <RowButton
        icon={ready ? 'download' : 'retry'}
        label={ready ? (update.kind === 'apk' ? t.ui.update.download : t.ui.update.apply) : ts.checkUpdates}
        value={status}
        onPress={() => (ready ? update.apply() : void update.check())}
      />
    </>
  );
}

function PeopleSection() {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <Section id="people" title={ts.people}>
      <div className={cx(cardClass, 'gap-4 py-4')}>
        <TextField label={ts.myName} description={ts.myNameHint} value={s.myName} onChange={(v) => setSetting('myName', v)} />
        <TextField
          label={ts.defaultAuthor}
          description={ts.defaultAuthorHint}
          value={s.defaultAuthor}
          onChange={(v) => setSetting('defaultAuthor', v)}
        />
        <TextField
          label={ts.cookbookTitle}
          description={ts.cookbookTitleHint}
          value={s.cookbookTitle}
          onChange={(v) => setSetting('cookbookTitle', v)}
        />
      </div>
    </Section>
  );
}

function VoiceCommandsSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const ts = t.ui.settings;
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={ts.voiceCommands} description={ts.voiceCommandsIntro}>
      <dl className="flex flex-col">
        {ts.commandList
          .map((item) => item as readonly [string, string])
          .map(([say, does]) => (
            <div key={say} className="flex flex-col gap-0.5 border-b border-line py-2.5">
              <dt className="type-display text-lg">“{say}”</dt>
              <dd className="text-ink-muted">{does}</dd>
            </div>
          ))}
      </dl>
    </Sheet>
  );
}

/** Voice folds open and shut on its heading, so the page stays short until it's wanted. */
function VoiceSection({ onCommands }: { onCommands: () => void }) {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <section id="settings-voice" aria-labelledby="settings-voice-title" className="scroll-mt-6">
      <Disclosure className="group flex flex-col">
        <Heading level={2} id="settings-voice-title" tabIndex={-1} className="type-heading text-lg outline-none">
          <AriaButton
            slot="trigger"
            className="-mb-1 flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-md px-1 text-left outline-none transition-colors duration-(--dur) data-[hovered]:bg-sunk data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-focus data-[focus-visible]:outline-solid"
          >
            {ts.voiceSection}
            <Icon
              name="chevron"
              className="shrink-0 rotate-90 text-ink-muted transition-transform duration-(--dur) group-data-[expanded]:-rotate-90"
            />
          </AriaButton>
        </Heading>
        <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip transition-[height] duration-(--dur) ease-(--ease-out)">
          {/* Room at the edges so the card's shadow isn't clipped while the panel opens. */}
          <div className="-mx-2 px-2 pt-3.5 pb-2">
            <div className={cardClass}>
              <Switch isSelected={s.readAloud} onChange={(v) => setSetting('readAloud', v)} description={ts.readAloudHint}>
                {ts.readAloud}
              </Switch>
              <Switch isSelected={s.speakQuestions} onChange={(v) => setSetting('speakQuestions', v)} description={ts.speakQuestionsHint}>
                {ts.speakQuestions}
              </Switch>
              <SpeechSettings />
              <RowButton label={ts.voiceCommands} value={ts.voiceCommandsHint} onPress={onCommands} />
            </div>
          </div>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}

function CookbookSection() {
  const ts = useT().ui.settings;
  return (
    <Section id="cookbook" title={ts.cookbookSection}>
      <BackupCard layout="phone" />
      <div className={cardClass}>
        <RowButton icon="print" label={ts.printCookbook} href="/print" />
      </div>
    </Section>
  );
}

function AppSection({ onShortcuts }: { onShortcuts?: () => void }) {
  const ts = useT().ui.settings;
  return (
    <Section id="app" title={ts.appSection}>
      <div className={cardClass}>
        {onShortcuts && <RowButton icon="keyboard" label={ts.shortcuts} onPress={onShortcuts} />}
        <RowButton icon="cookbook" label={ts.showWelcome} href="/welcome?from=settings" />
        <UpdateRow />
      </div>
    </Section>
  );
}

const SECTIONS: SectionId[] = ['text', 'look', 'voice', 'people', 'cookbook', 'app'];
const SECTION_ICONS: Record<SectionId, IconName> = {
  text: 'section',
  look: 'tidy',
  voice: 'read',
  people: 'edit',
  cookbook: 'backup',
  app: 'settings',
};

/** Desktop: which section is in view, for the index beside the page. */
function useSectionInView() {
  const [current, setCurrent] = useState<SectionId>('text');
  // A section picked in the index stays current while the page scrolls to it (the last ones can't reach the top).
  const pickedAt = useRef(0);
  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(`settings-${id}`)).filter((el) => el !== null);
    // A section counts once its top has passed the upper third of the window.
    const seen = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top && Date.now() - pickedAt.current > 1000) setCurrent(top.target.id.replace('settings-', '') as SectionId);
      },
      { rootMargin: '-15% 0px -65% 0px' },
    );
    els.forEach((el) => seen.observe(el));
    return () => seen.disconnect();
  }, []);
  const pick = (id: SectionId) => {
    pickedAt.current = Date.now();
    setCurrent(id);
  };
  return [current, pick] as const;
}

/** The desktop index: an icon and a short name per section; picking one scrolls there and focuses its heading. */
function SectionIndex() {
  const ts = useT().ui.settings;
  const [current, pick] = useSectionInView();
  return (
    <nav aria-label={ts.sections} className="sticky top-0 flex flex-col gap-0.5 self-start">
      {SECTIONS.map((id) => (
        <AriaButton
          key={id}
          aria-current={current === id ? 'true' : undefined}
          onPress={() => {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            // Scroll only the page's own scroller: scrollIntoView would also shift the shell around it.
            const main = document.getElementById('main');
            const el = document.getElementById(`settings-${id}`);
            if (main && el) {
              const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 24;
              main.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
            }
            document.getElementById(`settings-${id}-title`)?.focus({ preventScroll: true });
            pick(id);
          }}
          className="group flex min-h-[3rem] items-center gap-3 rounded-md px-3 text-left text-ink-muted transition-colors duration-(--dur) outline-none data-[hovered]:bg-sunk data-[hovered]:text-ink data-[focus-visible]:outline-3 data-[focus-visible]:outline-focus data-[focus-visible]:outline-solid aria-[current]:bg-surface aria-[current]:font-bold aria-[current]:text-ink aria-[current]:shadow-paper"
        >
          <Icon
            name={SECTION_ICONS[id]}
            size="1.25rem"
            current={current === id}
            className="shrink-0 transition-colors duration-(--dur) group-aria-[current]:text-accent-text"
          />
          {ts.index[id]}
        </AriaButton>
      ))}
    </nav>
  );
}

export function SettingsPage() {
  const t = useT();
  const ts = t.ui.settings;
  const desktop = useIsDesktop();
  const [sheet, setSheet] = useState<'commands' | 'shortcuts' | null>(null);
  const close = (open: boolean) => !open && setSheet(null);

  const sections = (
    <div className="flex min-w-0 flex-col gap-8">
      <TextSizeSection />
      <LookSection />
      <VoiceSection onCommands={() => setSheet('commands')} />
      <PeopleSection />
      <CookbookSection />
      <AppSection onShortcuts={desktop ? () => setSheet('shortcuts') : undefined} />
      <AboutApp />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pt-2 pb-10 desk:gap-8">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{ts.title}</h1>
      {desktop ? (
        <div className="grid grid-cols-[10rem_minmax(0,40rem)] items-start gap-12">
          <SectionIndex />
          {sections}
        </div>
      ) : (
        sections
      )}
      <VoiceCommandsSheet isOpen={sheet === 'commands'} onOpenChange={close} />
      <Sheet isOpen={sheet === 'shortcuts'} onOpenChange={close} title={t.ui.common.keyboardShortcuts} placement="corner">
        <ShortcutList />
      </Sheet>
    </div>
  );
}
