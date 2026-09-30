import { useState } from 'react';
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
  // Appear: a photo still decoding fades up once it's ready. One already decoded (seen a moment ago,
  // or the card photo a recipe's photo grows out of) is simply there, so nothing blinks.
  const [state, setState] = useState<'ready' | 'loading' | 'in'>('ready');
  if (!url) return <div className={cx(stripes, className)} aria-hidden />;
  return (
    <img
      ref={(img) => {
        if (img && !img.complete && state === 'ready') setState('loading');
      }}
      onLoad={() => setState((s) => (s === 'loading' ? 'in' : s))}
      src={url}
      alt={alt}
      className={cx(
        isVectorUrl(url) ? 'object-fill' : 'object-cover',
        state === 'loading' && 'opacity-0',
        state === 'in' && 'animate-photo-in',
        className,
      )}
      draggable={false}
    />
  );
}
