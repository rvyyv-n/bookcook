import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The number that drives a set of Rolling values (the servings, for a list of amounts). */
export const RollScope = createContext(0);

/**
 * A value that settles into place when it changes: it rolls up when its scope's number went up and
 * down when it went down (more servings, amounts rise; fewer, they drop). Nothing moves on first
 * show, or under Reduce Motion (the global rule makes the animation instant).
 */
export function Rolling({ value, children }: { value: string | number; children: ReactNode }) {
  const scope = useContext(RollScope);
  const last = useRef({ value, scope });
  const [roll, setRoll] = useState<{ n: number; up: boolean }>({ n: 0, up: true });
  useLayoutEffect(() => {
    if (last.current.value === value) return;
    const up = scope >= last.current.scope;
    last.current = { value, scope };
    setRoll((r) => ({ n: r.n + 1, up }));
  }, [value, scope]);
  return (
    <span key={roll.n} className={roll.n ? (roll.up ? 'inline-block animate-count-up' : 'inline-block animate-count-down') : undefined}>
      {children}
    </span>
  );
}
