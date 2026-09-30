import { useEffect, useState, type CSSProperties } from 'react';

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
