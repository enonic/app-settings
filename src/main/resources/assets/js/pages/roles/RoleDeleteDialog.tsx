import { useStore } from '@nanostores/preact';

import { PrincipalLabel } from '../../entities/principal/ui/PrincipalLabel';
import { DeleteConfirmDialog } from '../../shared/ui/dialogs/DeleteConfirmDialog';
import { rolesDeletion } from './model/deletion.store';

export function RoleDeleteDialog() {
  const targets = useStore(rolesDeletion.$payload);

  return (
    <DeleteConfirmDialog
      open={targets !== undefined}
      targets={(targets ?? []).map((role) => ({
        key: role.key,
        label: <PrincipalLabel principal={role} />,
      }))}
      // TODO: [#57] Enabled once `deletePrincipals` and its command exist.
      confirmDisabled
      onClose={rolesDeletion.close}
    />
  );
}
