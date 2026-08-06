import { useStore } from '@nanostores/preact';

import { PrincipalLabel } from '../../entities/principal/ui/PrincipalLabel';
import { DeleteConfirmDialog } from '../../shared/ui/dialogs/DeleteConfirmDialog';
import { groupsDeletion } from './model/deletion.store';

export function GroupDeleteDialog() {
  const targets = useStore(groupsDeletion.$payload);

  return (
    <DeleteConfirmDialog
      open={targets !== undefined}
      targets={(targets ?? []).map((group) => ({
        key: group.key,
        label: <PrincipalLabel principal={group} />,
      }))}
      // TODO: [#57] Enabled once `deletePrincipals` and its command exist.
      confirmDisabled
      onClose={groupsDeletion.close}
    />
  );
}
