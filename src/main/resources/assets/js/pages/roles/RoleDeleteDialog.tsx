import { useStore } from '@nanostores/preact';

import { DeleteConfirmDialog } from '../../shared/ui/dialogs/DeleteConfirmDialog';
import { rolesDeletion } from './model/deletion.store';

export function RoleDeleteDialog() {
  const targets = useStore(rolesDeletion.$payload);

  return (
    <DeleteConfirmDialog
      open={targets !== undefined}
      targets={(targets ?? []).map(({ key, displayName }) => ({ key, label: displayName }))}
      // TODO: [#57] Enabled once `deletePrincipals` exists; the command lands with it. Until then this
      // TODO: dialog can only be dismissed — no dialog in the dialog-first track commits anything.
      confirmDisabled
      onClose={rolesDeletion.close}
    />
  );
}
