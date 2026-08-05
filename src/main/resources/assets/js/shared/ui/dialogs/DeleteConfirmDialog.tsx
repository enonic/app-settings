import type { ReactNode } from 'react';

import { useI18n } from '../../i18n';
import { ModalDialog } from './ModalDialog';

export type DeleteTarget = {
  key: string;
  /** How the item reads elsewhere in the app: the caller renders it, so the dialog knows no domain. */
  label: ReactNode;
};

export type DeleteConfirmDialogProps = {
  open: boolean;
  targets: readonly DeleteTarget[];
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

export function DeleteConfirmDialog({
  open,
  targets,
  confirmDisabled,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const title = useI18n('browse.confirm.title');
  const question = useI18n(
    targets.length === 1
      ? 'browse.confirm.deleteQuestion'
      : 'browse.confirm.deleteQuestionMultiple',
  );
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

        <ul className="flex flex-col gap-2.5 py-1.5">
          {targets.map(({ key, label }) => (
            <li key={key}>{label}</li>
          ))}
        </ul>
      </div>
    </ModalDialog>
  );
}
