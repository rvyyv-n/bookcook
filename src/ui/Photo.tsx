import { isVectorUrl, useMediaUrl } from '../db/hooks';
import { cx } from './cx';

/** The striped placeholder for a recipe without a photo (or while one loads). */
export const stripes = 'bg-[repeating-linear-gradient(135deg,var(--sunk)_0_9px,var(--line)_9px_10px)]';

/**
 * A stored photo. Shows the striped placeholder while loading, or when there's no photo. Photos crop
 * to fill; SVG pictures fill the box and keep their drawing centred (their background runs to the edges).
 */
export function Photo({ id, alt, className }: { id: string | undefined; alt: string; className?: string }) {
  const url = useMediaUrl(id);
  if (!url) return <div className={cx(stripes, className)} aria-hidden />;
  return <img src={url} alt={alt} className={cx(isVectorUrl(url) ? 'object-fill' : 'object-cover', className)} draggable={false} />;
}
