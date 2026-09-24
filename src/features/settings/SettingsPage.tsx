import type { ReactNode } from 'react';
import { useSettings } from '../../db/hooks';
import { setSetting, type TextSize, type Theme } from '../../db/settings';
import { useT } from '../../i18n';
import { ShortcutList } from '../../app/shortcuts';
import { Segmented, Switch } from '../../ui/Controls';
import { TextField } from '../../ui/Field';
import { SpeechSettings } from './SpeechSettings';
import { BackupSection } from './BackupSection';

export function SettingsSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={`${id ?? title}-h`} className="flex flex-col gap-5 border-t border-line pt-8" id={id}>
      <h2 id={`${id ?? title}-h`} className="text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const t = useT();
  const s = useSettings();
  const ts = t.ui.settings;
  return (
    <div className="flex flex-col gap-10 pb-10">
      <h1 className="text-3xl">{ts.title}</h1>

      <section aria-labelledby="size-h" className="flex flex-col gap-5">
        <h2 id="size-h" className="text-2xl">
          {ts.textSize}
        </h2>
        <Segmented<TextSize>
          label={ts.textSize}
          labelHidden
          value={s.textSize}
          onChange={(v) => setSetting('textSize', v)}
          options={(['normal', 'large', 'huge'] as const).map((id) => ({ id, label: ts.textSizes[id] }))}
        />
        <p className="rounded-lg bg-surface p-5 text-lg shadow-paper" aria-live="polite">
          {ts.textPreview}
        </p>
      </section>

      <SettingsSection title={ts.theme}>
        <Segmented<Theme>
          label={ts.theme}
          labelHidden
          value={s.theme}
          onChange={(v) => setSetting('theme', v)}
          options={[
            { id: 'light', label: ts.themes.light, icon: 'sun' },
            { id: 'dark', label: ts.themes.dark, icon: 'moon' },
            { id: 'system', label: ts.themes.system },
          ]}
        />
      </SettingsSection>

      <SettingsSection title={t.ui.recipe.ingredients}>
        <TextField
          label={ts.defaultAuthor}
          description={ts.defaultAuthorHint}
          value={s.defaultAuthor}
          onChange={(v) => setSetting('defaultAuthor', v)}
        />
        <TextField label={ts.myName} description={ts.myNameHint} value={s.myName} onChange={(v) => setSetting('myName', v)} />
        <TextField
          label={ts.cookbookTitle}
          description={ts.cookbookTitleHint}
          value={s.cookbookTitle}
          onChange={(v) => setSetting('cookbookTitle', v)}
        />
      </SettingsSection>

      <SettingsSection title={ts.voiceSection}>
        <Switch isSelected={s.readAloud} onChange={(v) => setSetting('readAloud', v)}>
          {ts.readAloud}
        </Switch>
        <Switch isSelected={s.speakQuestions} onChange={(v) => setSetting('speakQuestions', v)}>
          {ts.speakQuestions}
        </Switch>
        <SpeechSettings />
      </SettingsSection>

      <BackupSection />

      <SettingsSection title={ts.language}>
        <p>English</p>
        <p className="text-ink-muted">{ts.languageNote}</p>
      </SettingsSection>

      <SettingsSection title={ts.shortcuts}>
        <ShortcutList />
      </SettingsSection>
    </div>
  );
}
