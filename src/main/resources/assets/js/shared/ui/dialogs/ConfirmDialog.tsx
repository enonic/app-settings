import type { ReactNode } from 'react';

import { useI18n } from '../../i18n';
import { ModalDialog } from './ModalDialog';

export type ConfirmDialogProps = {
  open: boolean;
  question: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
};

export function ConfirmDialog({
  open,
  question,
  confirmDisabled,
  children,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const title = useI18n('browse.confirm.title');
  const yesLabel = useI18n('browse.dialog.yes');
  const noLabel = useI18n('browse.dialog.no');
  const closeLabel = useI18n('browse.dialog.close');

  return (
    <ModalDialog
      open={open}
      title={title}
      primaryLabel={yesLabel}
      primaryDisabled={confirmDisabled}
      cancelLabel={noLabel}
      closeLabel={closeLabel}
      onClose={onClose}
      onPrimary={onConfirm}
    >
      <div className="flex flex-col gap-2.5">
        <p className="text-main text-base">{question}</p>
        {children}
      </div>
    </ModalDialog>
  );
}
