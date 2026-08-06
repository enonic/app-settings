import { useStore } from '@nanostores/preact';
import { Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { useIdProviderNames } from '../../entities/principal';
import { visitedErrors } from '../../shared/form';
import { i18n, useI18n } from '../../shared/i18n';
import { DialogIdentityHeader } from '../../shared/ui/dialogs/DialogIdentityHeader';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { GroupForm } from './GroupForm';
import { $groupEditDetail, showGroupForEdit } from './model/group-edit-detail';
import { $groupEditor, closeGroupEditor } from './model/group-editor.store';
import {
  initialGroupForm,
  nextGroupForm,
  validateGroupForm,
  type GroupFormField,
  type GroupForm as GroupFormValues,
} from './model/group-form';

export function GroupEditorDialog() {
  const editor = useStore($groupEditor);
  const detail = useStore($groupEditDetail);
  const editedKey = editor?.mode === 'edit' ? editor.group.key : undefined;
  const { items: providers } = useIdProviderNames();

  const createTitle = useI18n('groups.dialog.createTitle');
  const editTitle = useI18n('groups.dialog.editTitle');
  const displayNameLabel = useI18n('groups.dialog.displayName');
  const displayNamePlaceholder = useI18n('groups.dialog.displayNamePlaceholder');
  const saveLabel = useI18n('browse.dialog.save');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  const [values, setValues] = useState<GroupFormValues | undefined>();
  const [nameEdited, setNameEdited] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<GroupFormField>>(new Set());

  const onlyProvider = providers.length === 1 ? providers[0]?.key : undefined;

  useEffect(() => {
    setValues(editor === undefined ? undefined : initialGroupForm(editor, onlyProvider));
    setNameEdited(false);
    setVisited(new Set());
    showGroupForEdit(editedKey);
  }, [editor, editedKey, onlyProvider]);

  useEffect(() => {
    const loaded = detail.item;
    if (loaded === undefined || loaded.key !== editedKey) {
      return;
    }

    setValues((current) =>
      current === undefined || current.members.length > 0 || current.roles.length > 0
        ? current
        : { ...current, members: loaded.members, roles: loaded.roles },
    );
  }, [detail.item, editedKey]);

  const errors = useMemo(
    () =>
      values === undefined || editor === undefined ? {} : validateGroupForm(values, editor.mode),
    [values, editor],
  );

  const shownErrors = useMemo(() => visitedErrors(errors, visited), [errors, visited]);

  const handleChange = (next: GroupFormValues): void => {
    if (values === undefined || editor === undefined) {
      return;
    }

    const change = nextGroupForm(values, next, editor.mode, nameEdited);
    setValues(change.values);
    setNameEdited(change.nameEdited);
  };

  return (
    <ModalDialog
      open={editor !== undefined}
      title={editor?.mode === 'edit' ? editTitle : createTitle}
      primaryLabel={saveLabel}
      // TODO: [#59] Enabled by the form being error-free once the group mutations exist.
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={closeGroupEditor}
      header={
        values === undefined ? undefined : (
          <DialogIdentityHeader
            icon={<Users size={40} strokeWidth={1.5} aria-hidden />}
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
        <GroupForm
          values={values}
          errors={shownErrors}
          providers={providers}
          keyFixed={editor.mode === 'edit'}
          onChange={handleChange}
          onBlur={(field) => setVisited((current) => new Set(current).add(field))}
        />
      )}
    </ModalDialog>
  );
}
