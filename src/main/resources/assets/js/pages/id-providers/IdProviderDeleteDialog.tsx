import { useStore } from '@nanostores/preact';

import { DeleteConfirmDialog } from '../../shared/ui/dialogs/DeleteConfirmDialog';
import { idProvidersDeletion } from './model/deletion.store';

export function IdProviderDeleteDialog() {
  const targets = useStore(idProvidersDeletion.$payload);

  return (
    <DeleteConfirmDialog
      open={targets !== undefined}
      targets={(targets ?? []).map(({ key, displayName }) => ({ key, label: displayName }))}
      // TODO: [#63] Enabled once `deleteIdProviders` exists, which waits on the Java handlers of #62.
      confirmDisabled
      onClose={idProvidersDeletion.close}
    />
  );
}
