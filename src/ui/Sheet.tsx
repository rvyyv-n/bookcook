import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { useT } from '../i18n';
import { Button } from './Button';
import { cx } from './cx';

const widths = { md: 'desk:max-w-[36rem]', lg: 'desk:max-w-[42rem]' } as const;

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
}) {
  const t = useT();
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className={cx(
        'fixed inset-0 z-40 flex items-end justify-center bg-[rgb(var(--shadow-color)/.42)] desk:p-7',
        placement === 'center' ? 'desk:items-center' : 'desk:justify-end',
      )}
    >
      <Modal
        className={cx(
          'no-print flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-surface bg-(image:--grain) text-ink shadow-lift desk:rounded-xl',
          'data-[entering]:animate-rise',
          placement === 'corner' ? 'desk:max-w-[23.3333rem]' : widths[size],
        )}
      >
        <Dialog className="flex max-h-[92dvh] flex-col outline-none">
          {({ close }) => (
            <>
              <div className="flex flex-col gap-2 px-4 pt-2.5 desk:px-5 desk:pt-5">
                <span aria-hidden className="h-1.25 w-11 self-center rounded-full bg-line-strong desk:hidden" />
                <div className={cx('flex justify-between gap-2 pl-1.5', description ? 'items-start' : 'items-center')}>
                  <div className="flex flex-col gap-1">
                    <Heading
                      slot="title"
                      className={cx('leading-[1.05] tracking-[-0.015em]', placement === 'corner' ? 'text-xl' : 'text-2xl')}
                    >
                      {title}
                    </Heading>
                    {description && <p className="text-ink-muted">{description}</p>}
                  </div>
                  <Button variant="quiet" icon="close" onPress={close} className="px-3">
                    {t.ui.common.close}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-[max(1.5556rem,env(safe-area-inset-bottom))] desk:px-5">{children}</div>
              {footer && <div className="safe-bottom border-t border-line px-4 py-3 desk:px-5">{footer}</div>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
