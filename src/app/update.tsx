import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n';
import { isNative } from '../lib/platform/isNative';
import { checkApkUpdate, type Release } from '../lib/platform/apkUpdate';
import { checkForUpdate } from '../lib/platform/swUpdate';
import { useToast } from '../ui/Toast';

/** Where the app stands against the latest deploy. */
export type UpdateStatus = 'idle' | 'checking' | 'current' | 'ready' | 'failed';

interface UpdateApi {
  status: UpdateStatus;
  /** The web app swaps itself in place; the Android app downloads a new APK to install. */
  kind: 'web' | 'apk';
  check: () => Promise<void>;
  /** Web: switch to the new version (reloads the page). Android: download the new APK in the browser. */
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

/**
 * Keeps the app up to date. On the web, the service worker fetches new versions and the page swaps
 * to them. In the Android app, the latest GitHub release is compared with this build's version.
 * Either way a new version is offered once, never mid-cook, and Settings can check on demand.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const native = isNative();
  const t = useT();
  const toast = useToast();
  const { pathname } = useLocation();
  const reg = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const {
    needRefresh: [swReady],
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

  // The Android app: the release to offer, once one newer than this build is found.
  const [apk, setApk] = useState<Release | null>(null);
  const checkApk = useCallback(async () => setApk(await checkApkUpdate(__APP_VERSION__)), []);
  useEffect(() => {
    if (!native) return;
    const quietCheck = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) checkApk().catch(() => {});
    };
    quietCheck();
    const timer = setInterval(quietCheck, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', quietCheck);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', quietCheck);
    };
  }, [native, checkApk]);

  const ready = native ? !!apk : swReady;

  // Capacitor opens an address outside the app in the phone's browser, which downloads the APK.
  const apply = useCallback(() => {
    if (!native) void updateServiceWorker(true);
    else if (apk) window.location.assign(apk.url);
  }, [native, apk, updateServiceWorker]);

  const check = useCallback(async () => {
    if (native) {
      setStatus('checking');
      try {
        const found = await checkApkUpdate(__APP_VERSION__);
        setApk(found);
        setStatus(found ? 'ready' : 'current');
      } catch {
        setStatus('failed');
      }
      return;
    }
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
  }, [native]);

  // Offer the new version once, when nobody is in the middle of cooking or telling a recipe.
  // Ignored, it takes over the next time the app is opened.
  const offered = useRef(false);
  const busy = BUSY.some((re) => re.test(pathname));
  useEffect(() => {
    if (!ready || busy || offered.current) return;
    offered.current = true;
    const u = t.ui.update;
    toast.show({
      message: native ? u.readyApk : u.ready,
      action: { label: native ? u.download : u.apply, onAction: apply },
      timeout: 12000,
    });
  }, [ready, busy, toast, t, apply, native]);

  const api = useMemo<UpdateApi>(
    () => ({ status: ready ? 'ready' : status, kind: native ? 'apk' : 'web', check, apply }),
    [ready, status, native, check, apply],
  );
  return <UpdateContext.Provider value={api}>{children}</UpdateContext.Provider>;
}
