import { Button, cn, Dialog } from '@enonic/ui';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onOpenChange,
  className,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />

        <Dialog.Content className={cn('max-w-160', className)}>
          <Dialog.DefaultHeader title={title} description={message} withClose />

          <Dialog.Footer>
            <Button variant="outline" label={cancelLabel} onClick={() => onOpenChange(false)} />
            <Button variant="solid" label={confirmLabel} onClick={onConfirm} />
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
