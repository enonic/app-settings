import { useI18n } from '../../i18n';
import { ModalDialog } from './ModalDialog';

/** One thing the delete applies to, named as the user knows it. */
export type DeleteTarget = {
  key: string;
  label: string;
};

export type DeleteConfirmDialogProps = {
  open: boolean;
  /** What the delete applies to. Listed so the user can see it before agreeing to it. */
  targets: readonly DeleteTarget[];
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

/**
 * The confirmation in front of a delete, wherever it is triggered from.
 *
 * The wording is app-users' — `dialog.delete.question` and its plural, asked over lib-admin-ui's
 * `ConfirmationDialog` with its `Confirmation` title and Yes/No — so an administrator moving here reads
 * what they already read. What is added is the list: an action reaches the ticked rows or the active one
 * (`actionTargets`), which is not always what the user believes it reaches, so the dialog names them
 * rather than asking for a blind yes.
 */
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

        <ul className="text-subtle flex flex-col gap-1 text-sm">
          {targets.map(({ key, label }) => (
            <li key={key}>{label}</li>
          ))}
        </ul>
      </div>
    </ModalDialog>
  );
}
