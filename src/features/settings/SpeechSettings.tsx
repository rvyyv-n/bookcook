import { useSettings } from '../../db/hooks';
import { setSetting } from '../../db/settings';
import { useT } from '../../i18n';
import { Segmented } from '../../ui/Controls';

const RATES = { slow: 0.75, normal: 0.9, fast: 1.1 } as const;
type RateKey = keyof typeof RATES;

function nearest(rate: number): RateKey {
  return (Object.entries(RATES) as [RateKey, number][]).reduce(
    (best, cur) => (Math.abs(cur[1] - rate) < Math.abs(RATES[best] - rate) ? cur[0] : best),
    'normal' as RateKey,
  );
}

/** Speaking speed (and, once speech is available, the voice). */
export function SpeechSettings() {
  const t = useT();
  const s = useSettings();
  return (
    <Segmented<RateKey>
      label={t.ui.settings.speechRate}
      value={nearest(s.speechRate)}
      onChange={(k) => setSetting('speechRate', RATES[k])}
      options={(Object.keys(RATES) as RateKey[]).map((id) => ({ id, label: t.ui.settings.speechRates[id] }))}
    />
  );
}
