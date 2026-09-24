import type { ReactNode } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { useT } from '../i18n';
import { Button } from './Button';
import { cx } from './cx';

/**
 * A sheet: slides up from the bottom on phones, a centred panel on wide screens.
 * Always has a visible Close button (no swipe-only dismissal).
 */
export function Sheet({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  size = 'md',
  isDismissable = true,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  isDismissable?: boolean;
}) {
  const t = useT();
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] data-[entering]:animate-[fade_200ms_ease-out] sm:items-center sm:p-6"
    >
      <Modal
        className={cx(
          'no-print flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-paper shadow-lift sm:rounded-xl',
          'data-[entering]:animate-rise',
          size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <Dialog className="flex max-h-[92dvh] flex-col outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <Heading slot="title" className="flex-1 text-xl">
                  {title}
                </Heading>
                <Button variant="quiet" icon="close" onPress={close}>
                  {t.ui.common.close}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
              {footer && <div className="safe-bottom border-t border-line px-5 py-3">{footer}</div>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
