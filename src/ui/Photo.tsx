import { useMediaUrl } from '../db/hooks';
import { cx } from './cx';

/** A stored photo. Shows a warm placeholder while loading or if missing. */
export function Photo({ id, alt, className }: { id: string | undefined; alt: string; className?: string }) {
  const url = useMediaUrl(id);
  if (!url) return <div className={cx('bg-sunk', className)} aria-hidden />;
  return <img src={url} alt={alt} className={cx('object-cover', className)} draggable={false} />;
}
