import { Dialog } from '@enonic/ui';
import { useStore } from '@nanostores/preact';
import { useCallback } from 'preact/hooks';

import { type ServerEvent, useServerEvent } from '../../../shared/server-events';
import { $installDialogOpen, closeInstallDialog } from '../model/install-dialog.store';
import { toInstallProgress } from '../model/install-progress';
import { receiveInstallProgress } from '../model/install.store';
import { InstallApplicationsDialogContent } from './InstallApplicationsDialogContent';

/** The dialog itself: whether it is open, and the download progress it listens for */
export function InstallApplicationsDialog() {
  const open = useStore($installDialogOpen);

  const handleServerEvent = useCallback((event: ServerEvent) => {
    const progress = toInstallProgress(event);
    if (progress != null) {
      receiveInstallProgress(progress.url, progress.percent);
    }
  }, []);

  useServerEvent(handleServerEvent);

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          closeInstallDialog();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <InstallApplicationsDialogContent />
      </Dialog.Portal>
    </Dialog>
  );
}
