import { useStore } from '@nanostores/preact';

import { uninstallApplications } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { ConfirmDialog } from '../../../widgets/dialog/ConfirmDialog';
import { $uninstallTargets, closeUninstallDialog } from '../model/uninstall-dialog.store';

/**
 * Confirms an uninstall before it happens, and closes as it starts: the outcome is a toast per
 * application from the command itself, so there is nothing for the dialog to wait for.
 */
export function UninstallApplicationsDialog() {
  const targets = useStore($uninstallTargets);
  const name = targets?.[0]?.displayName ?? '';
  const count = targets?.length ?? 0;

  const title = useI18n('applications.dialog.uninstall.title');
  const oneQuestion = useI18n('applications.dialog.uninstall.question', name);
  const manyQuestion = useI18n('applications.dialog.uninstall.questionMany', count);
  const confirmLabel = useI18n('applications.action.uninstall');
  const cancelLabel = useI18n('dialog.cancel');

  if (targets === undefined) {
    return null;
  }

  const handleConfirm = (): void => {
    closeUninstallDialog();
    void uninstallApplications(targets);
  };

  return (
    <ConfirmDialog
      open
      title={title}
      message={targets.length === 1 ? oneQuestion : manyQuestion}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={handleConfirm}
      onOpenChange={closeUninstallDialog}
    />
  );
}
