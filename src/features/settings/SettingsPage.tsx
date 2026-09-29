import { useState, type ReactNode } from 'react';
import { Link } from 'react-aria-components';
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
import { RowButton, SelectRow } from '../../ui/Rows';
import { Sheet } from '../../ui/Sheet';
import { BackupCard } from './Backup';
import { SpeechSettings } from './SpeechSettings';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading text-lg">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The text-size control and a cook step to judge by. */
function TextSizeSection() {
  const ts = useT().ui.settings;
  return (
    <Section title={ts.textSize}>
      <TextSizeSegmented label={ts.textSize} />
      <p className="type-step rounded-lg bg-surface px-4.5 py-4 text-xl leading-[1.2] text-pretty shadow-paper" aria-live="polite">
        {ts.textPreview}
      </p>
    </Section>
  );
}

function LookSection() {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <Section title={ts.look}>
      <Segmented<Theme>
        label={ts.theme}
        labelHidden
        value={s.theme}
        onChange={(v) => setSetting('theme', v)}
        options={(['light', 'dark', 'system'] as const).map((id) => ({ id, label: ts.themes[id] }))}
      />
      <div className="flex flex-col">
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
    <Section title={ts.about}>
      <div className="flex flex-col gap-1.5 text-ink-muted">
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
      </div>
    </Section>
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
      <RowButton
        icon={ready ? 'download' : 'retry'}
        label={ready ? (update.kind === 'apk' ? t.ui.update.download : t.ui.update.apply) : ts.checkUpdates}
        value={status}
        onPress={() => (ready ? update.apply() : void update.check())}
      />
      <p aria-live="polite" className="sr-only">
        {ts.updateStatus[update.status]}
      </p>
    </>
  );
}

function PeopleSection() {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <Section title={ts.people}>
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

function VoiceSection({ onCommands }: { onCommands: () => void }) {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  return (
    <Section title={ts.voiceSection}>
      <div className="flex flex-col">
        <Switch isSelected={s.readAloud} onChange={(v) => setSetting('readAloud', v)} description={ts.readAloudHint}>
          {ts.readAloud}
        </Switch>
        <Switch isSelected={s.speakQuestions} onChange={(v) => setSetting('speakQuestions', v)} description={ts.speakQuestionsHint}>
          {ts.speakQuestions}
        </Switch>
      </div>
      <SpeechSettings />
      <RowButton label={ts.voiceCommands} value={ts.voiceCommandsHint} onPress={onCommands} />
    </Section>
  );
}

export function SettingsPage() {
  const t = useT();
  const ts = t.ui.settings;
  const desktop = useIsDesktop();
  const [sheet, setSheet] = useState<'commands' | 'shortcuts' | null>(null);
  const close = (open: boolean) => !open && setSheet(null);

  const more = (
    <div className="flex flex-col">
      {desktop && <RowButton icon="keyboard" label={ts.shortcuts} onPress={() => setSheet('shortcuts')} />}
      <RowButton icon="print" label={ts.printCookbook} href="/print" />
      <RowButton icon="cookbook" label={ts.showWelcome} href="/welcome?from=settings" />
      <UpdateRow />
    </div>
  );

  return (
    <div className="flex flex-col gap-7 pt-2 pb-10">
      <h1 className="text-3xl leading-none tracking-[-0.02em]">{ts.title}</h1>
      {desktop ? (
        <div className="grid grid-cols-2 items-start gap-x-10">
          <div className="flex flex-col gap-8">
            <TextSizeSection />
            <PeopleSection />
          </div>
          <div className="flex flex-col gap-8">
            <BackupCard layout="desk" />
            <VoiceSection onCommands={() => setSheet('commands')} />
            <LookSection />
            {more}
            <AboutApp />
          </div>
        </div>
      ) : (
        <>
          <BackupCard layout="phone" />
          <TextSizeSection />
          <LookSection />
          <PeopleSection />
          <VoiceSection onCommands={() => setSheet('commands')} />
          {more}
          <AboutApp />
        </>
      )}
      <VoiceCommandsSheet isOpen={sheet === 'commands'} onOpenChange={close} />
      <Sheet isOpen={sheet === 'shortcuts'} onOpenChange={close} title={t.ui.common.keyboardShortcuts} placement="corner">
        <ShortcutList />
      </Sheet>
    </div>
  );
}
