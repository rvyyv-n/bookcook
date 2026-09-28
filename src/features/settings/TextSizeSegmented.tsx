import { useSettings } from '../../db/hooks';
import { setSetting, type TextSize } from '../../db/settings';
import { useT } from '../../i18n';
import { Segmented } from '../../ui/Controls';

/** The text-size choice, its labels drawn at the size they pick (16, 19, 23px) whatever the current setting. */
export function TextSizeSegmented({ label, labelHidden = true }: { label: string; labelHidden?: boolean }) {
  const ts = useT().ui.settings;
  const s = useSettings();
  return (
    <Segmented<TextSize>
      label={label}
      labelHidden={labelHidden}
      size="XL"
      value={s.textSize}
      onChange={(v) => setSetting('textSize', v)}
      options={[
        { id: 'normal', label: ts.textSizes.normal, className: 'text-[16px]' },
        { id: 'large', label: ts.textSizes.large, className: 'text-[19px]' },
        { id: 'huge', label: ts.textSizes.huge, className: 'text-[23px]' },
      ]}
    />
  );
}
