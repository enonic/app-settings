import { Button, Dialog, IconButton } from '@enonic/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ModalDialogProps = {
  open: boolean;
  title: string;
  /** Sits under the title, and is what assistive technology reads as the dialog's description. */
  description?: string;
  /** The action the dialog exists for: Save, Create, Delete. */
  primaryLabel: string;
  /** Kept visible and greyed rather than hidden — a dialog with no visible action reads as broken. */
  primaryDisabled?: boolean;
  cancelLabel: string;
  closeLabel: string;
  children?: ReactNode;
  onClose: () => void;
  onPrimary?: () => void;
};

/**
 * The one modal shell every dialog is built from: title, a body the caller fills, and a cancel/confirm
 * footer. It takes labels and children, and names no domain.
 *
 * In `shared/ui` rather than in `widgets/` because a feature composes it — `features/role-editor` does —
 * and `widgets/` and `features/` may not import each other.
 *
 * Escape, a click outside and the close button all report through `onClose`, because the open state
 * lives in a store above the component (`shared/dialog`) rather than inside it.
 */
export function ModalDialog({
  open,
  title,
  description,
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

        <Dialog.Content>
          {/* ? Composed by hand rather than through `Dialog.DefaultHeader withClose`: that one
              ? hardcodes `aria-label='Close'` on its icon button and spreads its props onto the
              ? `Dialog.Close` wrapper instead, so a translated label cannot reach it. The grid
              ? classes are the ones `DefaultHeader` applies for the same layout. */}
          <Dialog.Header className="grid-cols-[minmax(0,1fr)_auto]">
            <Dialog.Title className="col-start-1 row-start-1 min-w-0">{title}</Dialog.Title>

            <Dialog.Close asChild>
              <IconButton
                aria-label={closeLabel}
                className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
                icon={X}
                size="lg"
                iconSize={36}
                iconStrokeWidth={1}
                shape="round"
                variant="filled"
              />
            </Dialog.Close>

            {description !== undefined && (
              <Dialog.Description className="row-start-2">{description}</Dialog.Description>
            )}
          </Dialog.Header>

          <Dialog.Body>{children}</Dialog.Body>

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
