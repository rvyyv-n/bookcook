import type { LucideProps } from 'lucide-react';
import { icons, type IconName } from '../design/icons';

export type { IconName };

/**
 * An icon from the design's lucide mapping (src/design/icons.ts). Icons always sit next to a
 * visible text label, so they are hidden from assistive tech. `current` draws the heavier stroke
 * the design uses for the current tab or sidebar row; `filled` is only for Star, Play/Pause and
 * the record dot.
 */
export function Icon({
  name,
  size = 24,
  current = false,
  filled = false,
  ...rest
}: { name: IconName; size?: number | string; current?: boolean; filled?: boolean } & Omit<LucideProps, 'ref'>) {
  const Glyph = icons[name];
  return (
    <Glyph
      size={size}
      strokeWidth={current ? 2.5 : 2}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}
