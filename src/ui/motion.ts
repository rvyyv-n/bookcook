import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/** What has already been on screen this session. */
const seen = new Set<string>();

/**
 * For `animate-stagger`: an item rises in, a beat after the one before it (its `index`), the first
 * time this session it's shown. Coming back to a page, or back from a recipe, it's simply there;
 * a new recipe or request still arrives with motion.
 */
export function useStagger(key: string, index: number): { className?: string; style?: CSSProperties } {
  const [first] = useState(() => !seen.has(key));
  useEffect(() => {
    seen.add(key);
  }, [key]);
  return first ? { className: 'animate-stagger', style: { '--i': index } as CSSProperties } : {};
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** --dur-settle, plus a beat to see the tick before the screen changes. */
const DONE_HOLD_MS = 420;

/**
 * For a Button's `done`: `finish()` turns the label into a tick and resolves once it has settled
 * (at once under Reduce Motion), so the screen changes after the tick is seen, not before.
 */
export function useDone(): [boolean, () => Promise<void>] {
  const [done, setDone] = useState(false);
  const finish = async () => {
    setDone(true);
    if (!prefersReducedMotion()) await new Promise((r) => setTimeout(r, DONE_HOLD_MS));
  };
  return [done, finish];
}

/** A duration token from motion.css (or tokens.css), in milliseconds, for the Web Animations API. */
function token(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000 || 0;
}
function easing(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'ease-out';
}

/**
 * Settle, for a list whose items come and go in place (requests, the recipe grid, grocery aisles).
 * Mark each item `data-flip="<its key>"` as a direct child of the returned ref. After every render,
 * items that moved glide from where they were to where they are, and items that are new fade in.
 * Positions are measured against the list, so scrolling the page doesn't count as moving.
 */
export function useFlip<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const last = useRef<Map<string, { x: number; y: number }> | null>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const origin = list.getBoundingClientRect();
    const items = [...list.querySelectorAll<HTMLElement>(':scope > [data-flip]')];
    const now = new Map<string, { x: number; y: number }>();
    const calm = prefersReducedMotion();
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const at = { x: r.left - origin.left, y: r.top - origin.top };
      now.set(el.dataset.flip!, at);
      if (calm || !last.current) continue;
      const was = last.current.get(el.dataset.flip!);
      if (!was) {
        el.animate(
          [
            { opacity: 0, scale: 0.97 },
            { opacity: 1, scale: 1 },
          ],
          {
            duration: token('--dur-settle'),
            easing: easing('--ease-settle'),
          },
        );
      } else if (Math.abs(was.x - at.x) > 0.5 || Math.abs(was.y - at.y) > 0.5) {
        el.animate([{ translate: `${was.x - at.x}px ${was.y - at.y}px` }, { translate: '0 0' }], {
          duration: token('--dur-settle'),
          easing: easing('--ease-settle'),
        });
      }
    }
    last.current = now;
  });
  return ref;
}

/**
 * Leave, before an item is removed from a useFlip list: it fades and shrinks a little, then resolves
 * so the removal can happen and the others close the gap. At once under Reduce Motion.
 */
export async function leave(el: Element | null | undefined): Promise<void> {
  if (!el || prefersReducedMotion()) return;
  await el.animate(
    [
      { opacity: 1, scale: 1 },
      { opacity: 0, scale: 0.97 },
    ],
    {
      duration: token('--dur-exit'),
      easing: easing('--ease-in'),
      fill: 'forwards',
    },
  ).finished;
}
