import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n';
import { isNative } from '../lib/platform/isNative';
import { checkForUpdate } from '../lib/platform/swUpdate';
import { useToast } from '../ui/Toast';

/** Where the app stands against the latest deploy. */
export type UpdateStatus = 'idle' | 'checking' | 'current' | 'ready' | 'failed';

interface UpdateApi {
  status: UpdateStatus;
  /** False in the Android app, which updates by installing a new APK. */
  available: boolean;
  check: () => Promise<void>;
  /** Switch to the new version (reloads the page). */
  apply: () => void;
}

const UpdateContext = createContext<UpdateApi | null>(null);

export function useAppUpdate(): UpdateApi {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useAppUpdate outside UpdateProvider');
  return ctx;
}

/** Checks again while the app stays open, and whenever it comes back to the front. */
const CHECK_EVERY_MS = 60 * 60 * 1000;

/** Screens where a reload would interrupt someone mid-task: the prompt waits until they leave. */
const BUSY = [/^\/r\/[^/]+\/cook$/, /^\/new\/(tell|talk)\//];

export function UpdateProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const toast = useToast();
  const { pathname } = useLocation();
  const reg = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const {
    needRefresh: [ready],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return;
      reg.current = r;
      const quietCheck = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void r.update().catch(() => {});
      };
      setInterval(quietCheck, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', quietCheck);
    },
  });

  const apply = useCallback(() => void updateServiceWorker(true), [updateServiceWorker]);

  const check = useCallback(async () => {
    const r = reg.current;
    if (!r) {
      setStatus('failed');
      return;
    }
    setStatus('checking');
    try {
      setStatus((await checkForUpdate(r)) ? 'ready' : 'current');
    } catch {
      setStatus('failed');
    }
  }, []);

  // Offer the new version once, when nobody is in the middle of cooking or telling a recipe.
  // Ignored, it takes over the next time the app is opened.
  const offered = useRef(false);
  const busy = BUSY.some((re) => re.test(pathname));
  useEffect(() => {
    if (!ready || busy || offered.current) return;
    offered.current = true;
    toast.show({ message: t.ui.update.ready, action: { label: t.ui.update.apply, onAction: apply }, timeout: 12000 });
  }, [ready, busy, toast, t, apply]);

  const api = useMemo<UpdateApi>(
    () => ({ status: ready ? 'ready' : status, available: !isNative(), check, apply }),
    [ready, status, check, apply],
  );
  return <UpdateContext.Provider value={api}>{children}</UpdateContext.Provider>;
}
