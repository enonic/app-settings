import { useStore } from '@nanostores/preact';
import { CircleUserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { isSystemUser, useIdProviderNames } from '../../entities/principal';
import { visitedErrors } from '../../shared/form';
import { i18n, useI18n } from '../../shared/i18n';
import { DialogIdentityHeader } from '../../shared/ui/dialogs/DialogIdentityHeader';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { $userEditDetail, showUserForEdit } from './model/user-edit-detail';
import { $userEditor, closeUserEditor } from './model/user-editor.store';
import {
  initialUserForm,
  nextUserForm,
  validateUserForm,
  type UserFormField,
  type UserForm as UserFormValues,
} from './model/user-form';
import { UserForm } from './UserForm';

export function UserEditorDialog() {
  const editor = useStore($userEditor);
  const detail = useStore($userEditDetail);
  const editedKey = editor?.mode === 'edit' ? editor.user.key : undefined;
  const { items: providers } = useIdProviderNames();

  const createTitle = useI18n('users.dialog.createTitle');
  const editTitle = useI18n('users.dialog.editTitle');
  const displayNameLabel = useI18n('users.dialog.displayName');
  const displayNamePlaceholder = useI18n('users.dialog.displayNamePlaceholder');
  const saveLabel = useI18n('browse.dialog.save');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  const [values, setValues] = useState<UserFormValues | undefined>();
  const [nameEdited, setNameEdited] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<UserFormField>>(new Set());

  const onlyProvider = providers.length === 1 ? providers[0]?.key : undefined;

  useEffect(() => {
    setValues(editor === undefined ? undefined : initialUserForm(editor, onlyProvider));
    setNameEdited(false);
    setVisited(new Set());
    showUserForEdit(editedKey);
  }, [editor, editedKey, onlyProvider]);

  useEffect(() => {
    const loaded = detail.item;
    if (loaded === undefined || loaded.key !== editedKey) {
      return;
    }

    setValues((current) =>
      current === undefined || current.roles.length > 0 || current.groups.length > 0
        ? current
        : { ...current, roles: loaded.roles, groups: loaded.groups },
    );
  }, [detail.item, editedKey]);

  const systemUser = editedKey !== undefined && isSystemUser(editedKey);
  const loaded = detail.item;
  const loadedKeys = loaded !== undefined && loaded.key === editedKey ? loaded.publicKeys : [];

  const errors = useMemo(
    () =>
      values === undefined || editor === undefined
        ? {}
        : validateUserForm(values, editor.mode, systemUser),
    [values, editor, systemUser],
  );

  const shownErrors = useMemo(() => visitedErrors(errors, visited), [errors, visited]);

  const handleChange = (next: UserFormValues): void => {
    if (values === undefined || editor === undefined) {
      return;
    }

    const change = nextUserForm(values, next, editor.mode, nameEdited);
    setValues(change.values);
    setNameEdited(change.nameEdited);
  };

  return (
    <ModalDialog
      open={editor !== undefined}
      title={editor?.mode === 'edit' ? editTitle : createTitle}
      size="wide"
      primaryLabel={saveLabel}
      // TODO: [#60] Enabled by the form being error-free once the user mutations exist.
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={closeUserEditor}
      header={
        values === undefined ? undefined : (
          <DialogIdentityHeader
            icon={<CircleUserRound size={40} strokeWidth={1.5} aria-hidden />}
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
        <UserForm
          values={values}
          keys={loadedKeys}
          errors={shownErrors}
          providers={providers}
          persisted={editor.mode === 'edit'}
          systemUser={systemUser}
          hasPassword={editor.mode === 'edit' && editor.user.hasPassword === true}
          onChange={handleChange}
          onBlur={(field) => setVisited((current) => new Set(current).add(field))}
        />
      )}
    </ModalDialog>
  );
}
