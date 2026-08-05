import { useStore } from '@nanostores/preact';
import { UserPen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { visitedErrors } from '../../shared/form';
import { i18n, useI18n } from '../../shared/i18n';
import { DialogIdentityHeader } from '../../shared/ui/dialogs/DialogIdentityHeader';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { $roleEditDetail, showRoleForEdit } from './model/role-edit-detail';
import { $roleEditor, closeRoleEditor } from './model/role-editor.store';
import {
  initialRoleForm,
  nextRoleForm,
  validateRoleForm,
  type RoleFormField,
  type RoleForm as RoleFormValues,
} from './model/role-form';
import { RoleForm } from './RoleForm';

export function RoleEditorDialog() {
  const editor = useStore($roleEditor);
  const detail = useStore($roleEditDetail);
  const editedKey = editor?.mode === 'edit' ? editor.role.key : undefined;

  const createTitle = useI18n('roles.dialog.createTitle');
  const editTitle = useI18n('roles.dialog.editTitle');
  const displayNameLabel = useI18n('roles.dialog.displayName');
  const displayNamePlaceholder = useI18n('roles.dialog.displayNamePlaceholder');
  const saveLabel = useI18n('browse.dialog.save');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  const [values, setValues] = useState<RoleFormValues | undefined>();
  const [nameEdited, setNameEdited] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<RoleFormField>>(new Set());

  useEffect(() => {
    setValues(editor === undefined ? undefined : initialRoleForm(editor));
    setNameEdited(false);
    setVisited(new Set());
    showRoleForEdit(editedKey);
  }, [editor, editedKey]);

  useEffect(() => {
    const loaded = detail.item;
    if (loaded === undefined || loaded.key !== editedKey) {
      return;
    }

    setValues((current) =>
      current === undefined || current.members.length > 0
        ? current
        : { ...current, members: loaded.members },
    );
  }, [detail.item, editedKey]);

  const errors = useMemo(
    () =>
      values === undefined || editor === undefined ? {} : validateRoleForm(values, editor.mode),
    [values, editor],
  );

  const shownErrors = useMemo(() => visitedErrors(errors, visited), [errors, visited]);

  const handleChange = (next: RoleFormValues): void => {
    if (values === undefined || editor === undefined) {
      return;
    }

    const change = nextRoleForm(values, next, editor.mode, nameEdited);
    setValues(change.values);
    setNameEdited(change.nameEdited);
  };

  return (
    <ModalDialog
      open={editor !== undefined}
      title={editor?.mode === 'edit' ? editTitle : createTitle}
      primaryLabel={saveLabel}
      // TODO: [#58] Enabled by the form being error-free once the role mutations exist.
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={closeRoleEditor}
      header={
        values === undefined ? undefined : (
          <DialogIdentityHeader
            icon={<UserPen size={40} strokeWidth={1.5} aria-hidden />}
            label={displayNameLabel}
            placeholder={displayNamePlaceholder}
            value={values.displayName}
            error={
              shownErrors.displayName === undefined ? undefined : i18n(shownErrors.displayName)
            }
            onInput={(displayName) => handleChange({ ...values, displayName })}
          />
        )
      }
    >
      {values !== undefined && editor !== undefined && (
        <RoleForm
          values={values}
          errors={shownErrors}
          nameFixed={editor.mode === 'edit'}
          onChange={handleChange}
          onBlur={(field) => setVisited((current) => new Set(current).add(field))}
        />
      )}
    </ModalDialog>
  );
}
