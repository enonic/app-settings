import { Button, cn, Dialog, IconButton, type ButtonVariant } from '@enonic/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useDialogLayer } from './dialog-stack';

export type ModalDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Shown in place of the title row — an icon and the item's name, as the wizards do. */
  header?: ReactNode;
  /** `wide` is for a form; a question needs no more room than its own text. */
  size?: 'default' | 'wide';
  primaryLabel?: string;
  primaryDisabled?: boolean;
  cancelLabel: string;
  /** `outline` gives the two answers of a question equal weight; a form's Cancel stays quiet. */
  cancelVariant?: ButtonVariant;
  /** Why the dialog is still open, shown beside its buttons — a rejected save is the case. */
  error?: string;
  closeLabel: string;
  children?: ReactNode;
  onClose: () => void;
  onPrimary?: () => void;
};

export function ModalDialog({
  open,
  title,
  description,
  header,
  size = 'default',
  primaryLabel,
  primaryDisabled,
  cancelLabel,
  cancelVariant = 'text',
  error,
  closeLabel,
  children,
  onClose,
  onPrimary,
}: ModalDialogProps) {
  const { blocked, nested } = useDialogLayer(open);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        {/* ! A nested overlay masks what is under it by sitting on `z-40` — the z the library hardcodes
            ! on the wrapper around every dialog's content — so paint order decides, and DOM order puts
            ! it after the open dialog's content and before this dialog's own. A higher z would cover
            ! this dialog too: `className` reaches the inner box, not that wrapper. */}
        <Dialog.Overlay
          className={nested ? 'z-40' : undefined}
          // ! The attribute belongs on the mask as well as on the content: a click on the mask is
          // ! outside this dialog's content, and without it the dialog underneath reads that click as
          // ! its own outside-click and closes along with this one.
          {...(nested && { 'data-click-outside-ignore': '' })}
        />

        <Dialog.Content
          className={cn('gap-5 p-5 md:p-7.5', size === 'wide' ? 'max-w-4xl' : 'max-w-lg')}
          // ! Both keep this dialog from being dismissed by a gesture meant for the one above it: the
          // ! attribute takes it out of the other dialog's outside-click test, and the prevented default
          // ! stops the library's Escape handler, which listens on the document per dialog.
          {...(nested && { 'data-click-outside-ignore': '' })}
          onEscapeKeyDown={(event) => {
            if (blocked) {
              event.preventDefault();
            }
          }}
        >
          <Dialog.Header className="grid-cols-[minmax(0,1fr)_auto] items-start">
            {header === undefined ? (
              <Dialog.Title className="col-start-1 row-start-1 min-w-0">{title}</Dialog.Title>
            ) : (
              <>
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <div className="col-start-1 row-start-1 min-w-0">{header}</div>
              </>
            )}

            <Dialog.Close asChild>
              <IconButton
                aria-label={closeLabel}
                className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
                icon={X}
                size="lg"
                iconSize={28}
                iconStrokeWidth={1.5}
                shape="round"
                variant="filled"
              />
            </Dialog.Close>

            {description !== undefined && (
              <Dialog.Description className="row-start-2">{description}</Dialog.Description>
            )}
          </Dialog.Header>

          <Dialog.Body className="-mx-2 flex flex-col gap-7 px-2 py-1">{children}</Dialog.Body>

          <Dialog.Footer className="items-center">
            {error !== undefined && (
              <p className="text-error mr-auto text-sm" role="alert">
                {error}
              </p>
            )}

            <Button variant={cancelVariant} label={cancelLabel} onClick={onClose} />
            {primaryLabel !== undefined && (
              <Button
                variant="solid"
                label={primaryLabel}
                disabled={primaryDisabled}
                onClick={onPrimary}
              />
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
