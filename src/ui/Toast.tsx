import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useT } from '../i18n';
import { cx } from './cx';
import { Icon } from './Icon';

export interface ToastOptions {
  message: string;
  /** "Undo" or another single action. */
  action?: { label: string; onAction: () => void | Promise<void> };
  timeout?: number;
  tone?: 'neutral' | 'success';
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  show: (t: ToastOptions) => void;
  /** Show "<message> · Undo" (the app uses undo instead of confirm dialogs, so destructive actions act at once). */
  undo: (message: string, onUndo: () => void | Promise<void>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}

let nextId = 1;
/** Toasts stay 6 seconds (paused while hovered or focused). */
const TOAST_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((all) => all.filter((i) => i.id !== id)), []);
  const show = useCallback((opts: ToastOptions) => {
    const id = nextId++;
    // One at a time keeps it calm; the newest replaces the rest.
    setItems([{ ...opts, id }]);
  }, []);
  const api = useMemo<ToastApi>(
    () => ({
      show,
      undo: (message, onUndo) => show({ message, action: { label: t.ui.common.undo, onAction: onUndo } }),
    }),
    [show, t],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label={t.ui.common.notifications}
        className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(var(--toast-offset,1.5rem)+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 desk:bottom-8"
      >
        <div aria-live="polite" className="contents">
          {items.map((item) => (
            <ToastView key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/** How far a toast is dragged before letting go dismisses it; a quick flick needs less. */
const SWIPE_AWAY_PX = 80;
const FLICK_PX_PER_MS = 0.5;

/**
 * A toast follows a finger sideways and fades as it goes. Let go past the threshold (or flick) and
 * it slides off the way it was going; short of it, it settles back. Taps on Undo are unaffected.
 */
function useSwipeAway(onAway: () => void) {
  const [dx, setDx] = useState(0);
  const [phase, setPhase] = useState<'rest' | 'drag' | 'back' | 'away'>('rest');
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const handlers = {
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    },
    onPointerMove(e: PointerEvent<HTMLDivElement>) {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      const x = e.clientX - s.x;
      // Only a sideways drag; a vertical one is left to the page.
      if (phase !== 'drag') {
        if (Math.abs(x) < 8 || Math.abs(x) < Math.abs(e.clientY - s.y)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setPhase('drag');
      }
      setDx(x);
    },
    onPointerUp(e: PointerEvent<HTMLDivElement>) {
      const s = start.current;
      start.current = null;
      if (!s || phase !== 'drag') return;
      const speed = Math.abs(dx) / Math.max(1, e.timeStamp - s.t);
      if (Math.abs(dx) > SWIPE_AWAY_PX || speed > FLICK_PX_PER_MS) {
        setPhase('away');
        setDx(Math.sign(dx || 1) * e.currentTarget.offsetWidth * 1.1);
        setTimeout(onAway, 160);
      } else {
        setPhase('back');
        setDx(0);
      }
    },
    onPointerCancel() {
      start.current = null;
      setPhase('back');
      setDx(0);
    },
  };
  const style: CSSProperties =
    phase === 'rest'
      ? {}
      : {
          translate: `${dx}px 0`,
          opacity: phase === 'away' ? 0 : 1 - Math.min(Math.abs(dx) / 240, 0.6),
          transition:
            phase === 'drag'
              ? 'none'
              : phase === 'away'
                ? 'translate var(--dur-exit) var(--ease-in), opacity var(--dur-exit) var(--ease-in)'
                : 'translate var(--dur-settle) var(--ease-settle), opacity var(--dur-settle) var(--ease-settle)',
        };
  return { handlers, style, dragging: phase === 'drag' };
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const swipe = useSwipeAway(onDismiss);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (paused || swipe.dragging) return;
    timer.current = setTimeout(() => setLeaving(true), item.timeout ?? TOAST_MS);
    return () => clearTimeout(timer.current);
  }, [paused, swipe.dragging, item.timeout]);
  // The fade ends the toast; this is for when no animation runs (a hidden tab).
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDismiss, 500);
    return () => clearTimeout(id);
  }, [leaving, onDismiss]);

  return (
    <div
      role="status"
      {...swipe.handlers}
      style={swipe.style}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // It fades out, then goes; under reduced motion that takes no time.
      onAnimationEnd={() => leaving && onDismiss()}
      className={cx(
        'pointer-events-auto flex min-h-[4rem] w-full touch-pan-y select-none max-w-[23.3333rem] items-center gap-3 rounded-md bg-ink py-1.5 pr-1.5 pl-4 text-paper shadow-lift',
        leaving ? 'animate-fade-out' : 'animate-rise',
      )}
    >
      {item.tone === 'success' && <Icon name="check" className="shrink-0" />}
      <p className="flex-1 py-2 font-bold">{item.message}</p>
      {item.action && (
        <AriaButton
          onPress={async () => {
            setLeaving(true);
            await item.action!.onAction();
          }}
          className="flex min-h-[3.5rem] shrink-0 items-center gap-1.5 rounded-md pr-[1.1rem] pl-[0.8rem] font-bold text-paper shadow-[inset_0_0_0_1.5px_var(--paper)] data-[focus-visible]:outline-paper data-[hovered]:bg-[rgb(255_255_255/.12)]"
        >
          <Icon name="undo" className="shrink-0" />
          {item.action.label}
        </AriaButton>
      )}
    </div>
  );
}
