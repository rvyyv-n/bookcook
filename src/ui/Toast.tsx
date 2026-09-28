import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => setLeaving(true), item.timeout ?? TOAST_MS);
    return () => clearTimeout(timer.current);
  }, [paused, item.timeout]);
  // The fade ends the toast; this is for when no animation runs (a hidden tab).
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDismiss, 500);
    return () => clearTimeout(id);
  }, [leaving, onDismiss]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // It fades out, then goes; under reduced motion that takes no time.
      onAnimationEnd={() => leaving && onDismiss()}
      className={cx(
        'pointer-events-auto flex min-h-[4rem] w-full max-w-[23.3333rem] items-center gap-3 rounded-md bg-ink py-1.5 pr-1.5 pl-4 text-paper shadow-lift',
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
