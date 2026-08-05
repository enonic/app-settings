import { useStore } from '@nanostores/preact';

import { useI18n } from '../../shared/i18n';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { $roleEditor, closeRoleEditor } from './model/role-editor.store';

/**
 * The role dialog, opened from the toolbar, the row menu or the details panel.
 *
 * Mounted by the page and open only while the store holds a payload, so the two entry points share
 * one dialog rather than each rendering their own.
 */
export function RoleEditorDialog() {
  const editor = useStore($roleEditor);

  const createTitle = useI18n('roles.dialog.createTitle');
  const editTitle = useI18n('roles.dialog.editTitle');
  const saveLabel = useI18n('browse.dialog.save');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  return (
    <ModalDialog
      open={editor !== undefined}
      title={editor?.mode === 'edit' ? editTitle : createTitle}
      primaryLabel={saveLabel}
      // TODO: [#52] The form — name, display name, description and members.
      // TODO: [#58] Save becomes enabled by the form's validity once the role mutations exist.
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={closeRoleEditor}
    />
  );
}
