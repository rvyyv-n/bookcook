import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { useT } from '../i18n';
import { Button } from './Button';
import { cx } from './cx';

const widths = { md: 'desk:max-w-[36rem]', lg: 'desk:max-w-[42rem]', wide: 'desk:max-w-[37.7778rem]' } as const;
/** The wide dialog (the New recipe chooser) has roomier padding on desktop. */
const pad = (size: keyof typeof widths) => (size === 'wide' ? 'desk:px-7' : 'desk:px-5');

/** How far (px) a finger moves before the sheet follows it, and how fast (px/ms) a flick closes it. */
const DRAG_SLOP = 8;
const FLICK = 0.5;

/**
 * Drag the top of a sheet down to close it, as on a phone: it follows the finger, and closes when
 * pulled a third of the way or flicked; otherwise it springs back. Touch and pen only.
 */
function useDragToClose(close: () => void, enabled: boolean) {
  const drag = useRef<{ y: number; t: number; dy: number; el: HTMLElement; moving: boolean } | null>(null);
  const end = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moving) return;
    const { el, dy } = d;
    const fast = dy / Math.max(1, e.timeStamp - d.t) > FLICK;
    if (e.type === 'pointerup' && (dy > el.offsetHeight / 3 || fast)) {
      el.style.transition = 'transform var(--dur-exit) var(--ease-in)';
      el.style.transform = 'translateY(100%)';
      el.addEventListener(
        'transitionend',
        () => {
          // Already off screen: skip the usual closing animation.
          el.style.animation = 'none';
          close();
        },
        { once: true },
      );
    } else {
      el.style.transition = 'transform var(--dur) var(--ease-out)';
      el.style.transform = '';
    }
  };
  if (!enabled) return {};
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget.closest<HTMLElement>('[data-sheet]');
      if (e.pointerType !== 'mouse' && el) drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, el, moving: false };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const d = drag.current;
      if (!d) return;
      d.dy = Math.max(0, e.clientY - d.y);
      if (!d.moving) {
        if (d.dy < DRAG_SLOP) return;
        d.moving = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        d.el.style.transition = 'none';
      }
      // Measure speed over the last move only, so a slow pull that ends in a flick still closes.
      d.t = e.timeStamp;
      d.el.style.transform = `translateY(${d.dy}px)`;
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

/** The sheet's top (grabber, title, Close): the part a finger pulls down. */
function SheetTop({
  close,
  dismissable,
  className,
  children,
}: {
  close: () => void;
  dismissable: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(className, dismissable && 'touch-none')} {...useDragToClose(close, dismissable)}>
      {children}
    </div>
  );
}

/**
 * Whether the on-screen keyboard is up, from the visible screen shrinking well below the tallest it
 * has been at this width. Works whether the browser shrinks the page for the keyboard (Android) or
 * slides the keyboard over it (iPhone).
 */
function useKeyboardOpen(active: boolean): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    let width = vv.width;
    let tallest = vv.height;
    const check = () => {
      // Turning the phone changes the shape: start measuring again.
      if (Math.abs(vv.width - width) > 1) {
        width = vv.width;
        tallest = vv.height;
      }
      tallest = Math.max(tallest, vv.height);
      setOpen(vv.height < tallest * 0.75);
    };
    check();
    vv.addEventListener('resize', check);
    return () => {
      vv.removeEventListener('resize', check);
      setOpen(false);
    };
  }, [active]);
  return active && open;
}

/**
 * A sheet: rises from the bottom on phones, a centred panel on desktop (or pinned to the
 * bottom-right corner with `placement="corner"`). Focus is trapped, Esc closes it, and it always
 * has a visible Close button (no swipe-only dismissal).
 */
export function Sheet({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  placement = 'center',
  isDismissable = true,
  besideSidebar = false,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** A line under the title ("That's 13 times now."). */
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof widths;
  placement?: 'center' | 'corner';
  isDismissable?: boolean;
  /** On desktop, dim only the page and leave the sidebar uncovered. */
  besideSidebar?: boolean;
}) {
  const t = useT();
  // With the keyboard up there's room for little: the description goes, and the footer scrolls with
  // the form instead of holding space at the bottom.
  const keyboard = useKeyboardOpen(isOpen);
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      // Sized to the visible screen, so on a phone the sheet rides up above the keyboard.
      className={cx(
        'fixed inset-x-0 top-0 z-40 h-(--visual-viewport-height) flex items-end justify-center bg-[rgb(var(--shadow-color)/.42)] desk:p-7',
        'data-[entering]:animate-scrim-in data-[exiting]:animate-fade-out',
        placement === 'center' ? 'desk:items-center' : 'desk:justify-end',
        besideSidebar && 'desk:left-[252px] desk:bg-[rgb(var(--shadow-color)/.32)]',
      )}
    >
      <Modal
        data-sheet
        className={cx(
          'no-print relative flex max-h-[calc(var(--visual-viewport-height)*.92)] w-full flex-col rounded-t-xl bg-surface bg-(image:--grain) text-ink shadow-lift desk:rounded-xl',
          // The sheet carries on below the screen's edge, so a see-through keyboard shows the sheet, not the page.
          "after:absolute after:inset-x-0 after:top-full after:h-dvh after:bg-surface after:content-[''] desk:after:hidden",
          'data-[entering]:animate-rise data-[exiting]:animate-drop-out',
          placement === 'corner' ? 'desk:max-w-[23.3333rem]' : widths[size],
        )}
      >
        <Dialog className="flex max-h-[calc(var(--visual-viewport-height)*.92)] flex-col outline-none">
          {({ close }) => (
            <>
              <SheetTop
                close={close}
                dismissable={isDismissable}
                className={cx('flex flex-col gap-2 px-4 pt-2.5', pad(size), size === 'wide' ? 'desk:pt-7' : 'desk:pt-5')}
              >
                <span aria-hidden className="h-1.25 w-11 self-center rounded-full bg-line-strong desk:hidden" />
                <div className={cx('flex justify-between gap-2 pl-1.5', description ? 'items-start' : 'items-center')}>
                  <div className="flex flex-col gap-1">
                    <Heading
                      slot="title"
                      className={cx('leading-[1.05] tracking-[-0.015em]', placement === 'corner' ? 'text-xl' : 'text-2xl')}
                    >
                      {title}
                    </Heading>
                    {description && !keyboard && <p className="text-ink-muted">{description}</p>}
                  </div>
                  <Button variant="quiet" icon="close" onPress={close} className="px-3">
                    {t.ui.common.close}
                  </Button>
                </div>
              </SheetTop>
              <div className={cx('flex-1 overflow-y-auto px-4 pt-3.5 pb-[max(1.5556rem,env(safe-area-inset-bottom))]', pad(size))}>
                {children}
                {footer && keyboard && <div className="pt-5">{footer}</div>}
              </div>
              {footer && !keyboard && <div className="safe-bottom border-t border-line px-4 py-3 desk:px-5">{footer}</div>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
