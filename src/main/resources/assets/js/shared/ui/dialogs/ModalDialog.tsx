import { Button, Dialog, IconButton } from '@enonic/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ModalDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Shown in place of the title row — an icon and the item's name, as the wizards do. */
  header?: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  cancelLabel: string;
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
  primaryLabel,
  primaryDisabled,
  cancelLabel,
  closeLabel,
  children,
  onClose,
  onPrimary,
}: ModalDialogProps) {
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
        <Dialog.Overlay />

        <Dialog.Content className="max-w-4xl gap-5 md:gap-5 md:p-7.5">
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

          <Dialog.Footer>
            <Button variant="text" label={cancelLabel} onClick={onClose} />
            <Button
              variant="solid"
              label={primaryLabel}
              disabled={primaryDisabled}
              onClick={onPrimary}
            />
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
