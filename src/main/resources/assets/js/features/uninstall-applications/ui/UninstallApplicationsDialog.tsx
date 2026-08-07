import { useStore } from '@nanostores/preact';

import { ApplicationIcon, uninstallApplications } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { ConfirmDialog } from '../../../shared/ui/dialogs/ConfirmDialog';
import { ItemLabel } from '../../../shared/ui/ItemLabel';
import { $uninstallTargets, closeUninstallDialog } from '../model/uninstall-dialog.store';

/**
 * Confirms an uninstall before it happens, and closes as it starts: the outcome is a toast per
 * application from the command itself, so there is nothing for the dialog to wait for.
 */
export function UninstallApplicationsDialog() {
  const targets = useStore($uninstallTargets);

  const question = useI18n(
    targets?.length === 1
      ? 'applications.dialog.uninstall.question'
      : 'applications.dialog.uninstall.questionMultiple',
  );

  const handleConfirm = (): void => {
    closeUninstallDialog();

    if (targets !== undefined) {
      void uninstallApplications(targets);
    }
  };

  return (
    <ConfirmDialog
      open={targets !== undefined}
      question={question}
      onClose={closeUninstallDialog}
      onConfirm={handleConfirm}
    >
      <ul className="flex flex-col gap-2.5 py-1.5">
        {(targets ?? []).map((application) => (
          <li key={application.key}>
            <ItemLabel
              icon={<ApplicationIcon icon={application.icon} />}
              primary={application.displayName}
              secondary={application.key}
            />
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  );
}
