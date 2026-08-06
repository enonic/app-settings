import { useStore } from '@nanostores/preact';

import { PrincipalLabel } from '../../entities/principal/ui/PrincipalLabel';
import { DeleteConfirmDialog } from '../../shared/ui/dialogs/DeleteConfirmDialog';
import { usersDeletion } from './model/deletion.store';

export function UserDeleteDialog() {
  const targets = useStore(usersDeletion.$payload);

  return (
    <DeleteConfirmDialog
      open={targets !== undefined}
      targets={(targets ?? []).map((user) => ({
        key: user.key,
        label: <PrincipalLabel principal={user} />,
      }))}
      // TODO: [#57] Enabled once `deletePrincipals` and its command exist.
      confirmDisabled
      onClose={usersDeletion.close}
    />
  );
}
