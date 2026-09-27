import type { ReactNode } from 'react';
import { useSettings } from '../../db/hooks';
import { setSetting, setSkin, type Accent, type Skin, type TextSize, type Theme } from '../../db/settings';
import { SKIN_LABELS, SKINS, skinConfig } from '../../design/skin';
import { useT } from '../../i18n';
import { ShortcutList } from '../../app/shortcuts';
import { Segmented, Switch } from '../../ui/Controls';
import { TextField } from '../../ui/Field';
import { SelectField } from '../../ui/Select';
import { SpeechSettings } from './SpeechSettings';

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
          size="XL"
          value={s.textSize}
          onChange={(v) => setSetting('textSize', v)}
          // Each label is drawn at the size it picks (16, 19, 23px), independent of the current setting.
          options={[
            { id: 'normal', label: ts.textSizes.normal, className: 'text-[16px]' },
            { id: 'large', label: ts.textSizes.large, className: 'text-[19px]' },
            { id: 'huge', label: ts.textSizes.huge, className: 'text-[23px]' },
          ]}
        />
        <p className="rounded-lg bg-surface p-5 text-lg shadow-paper" aria-live="polite">
          {ts.textPreview}
        </p>
      </section>

      <SettingsSection title={ts.look}>
        <Segmented<Theme>
          label={ts.theme}
          labelHidden
          value={s.theme}
          onChange={(v) => setSetting('theme', v)}
          options={(['light', 'dark', 'system'] as const).map((id) => ({ id, label: ts.themes[id] }))}
        />
        <SelectField<Skin>
          label={ts.style}
          value={s.skin}
          onChange={(v) => setSkin(v)}
          options={SKINS.map((id) => ({ id, label: SKIN_LABELS[id] }))}
        />
        {skinConfig[s.skin].accentLocked ? (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold">{ts.accent}</span>
            <span>{ts.accentFixed}</span>
          </div>
        ) : (
          <Segmented<Accent>
            label={ts.accent}
            value={s.accent}
            onChange={(v) => setSetting('accent', v)}
            options={(['tomato', 'saffron'] as const).map((id) => ({ id, label: ts.accents[id] }))}
          />
        )}
        <div>
          <Switch isSelected={s.spiceColours} onChange={(v) => setSetting('spiceColours', v)} description={ts.spiceColoursHint}>
            {ts.spiceColours}
          </Switch>
          <Switch isSelected={s.stepPhoto} onChange={(v) => setSetting('stepPhoto', v)} description={ts.stepPhotosHint}>
            {ts.stepPhotos}
          </Switch>
        </div>
      </SettingsSection>

      <SettingsSection title={ts.people}>
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
        <div>
          <Switch isSelected={s.readAloud} onChange={(v) => setSetting('readAloud', v)}>
            {ts.readAloud}
          </Switch>
          <Switch isSelected={s.speakQuestions} onChange={(v) => setSetting('speakQuestions', v)}>
            {ts.speakQuestions}
          </Switch>
        </div>
        <SpeechSettings />
      </SettingsSection>

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
