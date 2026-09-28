import { useEffect, useState } from 'react';
import { useSpeaker } from '../../app/speech';
import { useSettings } from '../../db/hooks';
import { setSetting } from '../../db/settings';
import { useT } from '../../i18n';
import { speech, type Voice } from '../../lib/speech';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Controls';
import { SelectRow } from '../../ui/Rows';

const RATES = { slow: 0.75, normal: 0.9, fast: 1.1 } as const;
type RateKey = keyof typeof RATES;

function nearest(rate: number): RateKey {
  return (Object.entries(RATES) as [RateKey, number][]).reduce(
    (best, cur) => (Math.abs(cur[1] - rate) < Math.abs(RATES[best] - rate) ? cur[0] : best),
    'normal' as RateKey,
  );
}

/** The device's voices in this language. They can arrive after the page loads. */
function useVoices(lang: string): Voice[] {
  const [voices, setVoices] = useState(() => speech.voices());
  useEffect(() => speech.onVoicesChanged(() => setVoices(speech.voices())), []);
  const base = lang.split('-')[0]!.toLowerCase();
  return voices.filter((v) => v.lang.toLowerCase().startsWith(base));
}

const DEFAULT = '';

/** Speech speed, the voice, and a Hear it to try them. */
export function SpeechSettings() {
  const t = useT();
  const ts = t.ui.settings;
  const s = useSettings();
  const voices = useVoices(t.speechLang);
  const speaker = useSpeaker();
  return (
    <>
      <Segmented<RateKey>
        label={ts.speechRate}
        value={nearest(s.speechRate)}
        onChange={(k) => setSetting('speechRate', RATES[k])}
        options={(Object.keys(RATES) as RateKey[]).map((id) => ({ id, label: ts.speechRates[id] }))}
      />
      {speaker.canSpeak && (
        <div className="flex flex-col">
          {voices.length > 0 && (
            <SelectRow
              label={ts.voice}
              value={s.voiceURI && voices.some((v) => v.uri === s.voiceURI) ? s.voiceURI : DEFAULT}
              onChange={(uri) => setSetting('voiceURI', uri === DEFAULT ? null : uri)}
              options={[{ id: DEFAULT, label: ts.defaultVoice }, ...voices.map((v) => ({ id: v.uri, label: v.name }))]}
            />
          )}
          <Button
            variant="quiet"
            icon={speaker.speaking ? 'stop' : 'read'}
            aria-pressed={speaker.speaking}
            className="self-start"
            onPress={() => (speaker.speaking ? speaker.cancel() : void speaker.speak(ts.textPreview))}
          >
            {speaker.speaking ? t.ui.common.stop : ts.testVoice}
          </Button>
        </div>
      )}
    </>
  );
}
