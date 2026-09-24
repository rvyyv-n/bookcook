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
  /** Show "<message> · Undo" (the app uses undo instead of confirm dialogs). */
  undo: (message: string, onUndo: () => void | Promise<void>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}

let nextId = 1;

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
      undo: (message, onUndo) => show({ message, action: { label: t.ui.common.undo, onAction: onUndo }, timeout: 8000 }),
    }),
    [show, t],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label={t.ui.common.notifications}
        className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
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
  const t = useT();
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(onDismiss, item.timeout ?? 5000);
    return () => clearTimeout(timer.current);
  }, [paused, item.timeout, onDismiss]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cx(
        'pointer-events-auto flex w-full max-w-lg animate-rise items-center gap-3 rounded-lg py-2 pr-2 pl-5 text-base shadow-lift',
        'bg-ink text-paper',
      )}
    >
      {item.tone === 'success' && <Icon name="check" className="shrink-0" />}
      <p className="flex-1 py-2">{item.message}</p>
      {item.action && (
        <AriaButton
          onPress={async () => {
            onDismiss();
            await item.action!.onAction();
          }}
          className="min-h-12 rounded-md bg-accent px-4 font-bold text-accent-ink outline-none data-[focus-visible]:outline-3 data-[focus-visible]:outline-paper"
        >
          {item.action.label}
        </AriaButton>
      )}
      <AriaButton
        onPress={onDismiss}
        aria-label={t.ui.common.dismiss}
        className="grid min-h-12 min-w-12 place-items-center rounded-md text-paper/80 outline-none data-[hovered]:text-paper data-[focus-visible]:outline-3 data-[focus-visible]:outline-paper"
      >
        <Icon name="close" size={20} />
      </AriaButton>
    </div>
  );
}
