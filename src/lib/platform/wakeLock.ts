import { useEffect } from 'react';

/** Keep the screen on while `active` (cook mode). The lock drops when the tab is hidden, so it's taken again on return. */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let gone = false;
    const take = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (gone) void next.release();
        else lock = next;
      } catch {
        // Refused (battery saver, or no permission): the screen just sleeps as usual.
      }
    };
    void take();
    document.addEventListener('visibilitychange', take);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', take);
      void lock?.release();
    };
  }, [active]);
}
