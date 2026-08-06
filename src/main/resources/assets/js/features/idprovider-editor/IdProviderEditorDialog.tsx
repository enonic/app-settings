import { useStore } from '@nanostores/preact';
import { KeyRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'preact/hooks';

import {
  fetchIdProviderApplications,
  type IdProviderApplication,
} from '../../entities/application';
import { fetchDefaultIdProviderPermissions } from '../../entities/principal';
import { visitedErrors } from '../../shared/form';
import { i18n, useI18n } from '../../shared/i18n';
import { DialogIdentityHeader } from '../../shared/ui/dialogs/DialogIdentityHeader';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { IdProviderForm } from './IdProviderForm';
import { $idProviderEditDetail, showIdProviderForEdit } from './model/idprovider-edit-detail';
import { $idProviderEditor, closeIdProviderEditor } from './model/idprovider-editor.store';
import {
  initialIdProviderForm,
  isSystemIdProvider,
  nextIdProviderForm,
  validateIdProviderForm,
  type IdProviderFormField,
  type IdProviderForm as IdProviderFormValues,
} from './model/idprovider-form';

export function IdProviderEditorDialog() {
  const editor = useStore($idProviderEditor);
  const detail = useStore($idProviderEditDetail);
  const editedKey = editor?.mode === 'edit' ? editor.provider.key : undefined;

  const createTitle = useI18n('idProviders.dialog.createTitle');
  const editTitle = useI18n('idProviders.dialog.editTitle');
  const displayNameLabel = useI18n('idProviders.dialog.displayName');
  const displayNamePlaceholder = useI18n('idProviders.dialog.displayNamePlaceholder');
  const saveLabel = useI18n('browse.dialog.save');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  const [values, setValues] = useState<IdProviderFormValues | undefined>();
  const [nameEdited, setNameEdited] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<IdProviderFormField>>(new Set());
  const [applications, setApplications] = useState<readonly IdProviderApplication[]>([]);
  const [defaultPrincipals, setDefaultPrincipals] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setValues(editor === undefined ? undefined : initialIdProviderForm(editor));
    setNameEdited(false);
    setVisited(new Set());
    setDefaultPrincipals(new Set());
    showIdProviderForEdit(editedKey);
  }, [editor, editedKey]);

  // The permissions of the provider being edited, once they arrive.
  useEffect(() => {
    const loaded = detail.item;
    if (loaded === undefined || loaded.key !== editedKey) {
      return;
    }

    setValues((current) =>
      current === undefined || current.permissions.length > 0
        ? current
        : { ...current, permissions: loaded.permissions },
    );
  }, [detail.item, editedKey]);

  // ! The three entries every provider is seeded with. A new provider starts from them, and in both modes
  // ! they are pinned wherever they appear — see `pinnedPermissions`. A provider nobody may reach is the
  // ! one shape an administrator never wants.
  useEffect(() => {
    if (editor === undefined) {
      return;
    }

    const create = editor.mode === 'create';
    const controller = new AbortController();

    void fetchDefaultIdProviderPermissions(controller.signal).match(
      (permissions) => {
        if (controller.signal.aborted) {
          return;
        }

        setDefaultPrincipals(new Set(permissions.map(({ principal }) => principal.key)));

        if (create) {
          setValues((current) =>
            current === undefined || current.permissions.length > 0
              ? current
              : { ...current, permissions },
          );
        }
      },
      () => undefined,
    );

    return () => controller.abort();
  }, [editor]);

  useEffect(() => {
    if (editor === undefined) {
      return;
    }

    const controller = new AbortController();

    void fetchIdProviderApplications(controller.signal).match(
      (loaded) => {
        if (!controller.signal.aborted) {
          setApplications(loaded);
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setApplications([]);
        }
      },
    );

    return () => controller.abort();
  }, [editor]);

  const errors = useMemo(
    () =>
      values === undefined || editor === undefined
        ? {}
        : validateIdProviderForm(values, editor.mode),
    [values, editor],
  );

  const shownErrors = useMemo(() => visitedErrors(errors, visited), [errors, visited]);

  const handleChange = (next: IdProviderFormValues): void => {
    if (values === undefined || editor === undefined) {
      return;
    }

    const change = nextIdProviderForm(values, next, editor.mode, nameEdited);
    setValues(change.values);
    setNameEdited(change.nameEdited);
  };

  return (
    <ModalDialog
      open={editor !== undefined}
      title={editor?.mode === 'edit' ? editTitle : createTitle}
      size="wide"
      primaryLabel={saveLabel}
      // TODO: [#63] Enabled by the form being error-free once the provider mutations exist, which wait
      // on the Java handlers of #62.
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={closeIdProviderEditor}
      header={
        values === undefined ? undefined : (
          <DialogIdentityHeader
            icon={<KeyRound size={40} strokeWidth={1.5} aria-hidden />}
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
        <IdProviderForm
          values={values}
          errors={shownErrors}
          applications={applications}
          nameFixed={editor.mode === 'edit'}
          applicationFixed={editedKey !== undefined && isSystemIdProvider(editedKey)}
          defaultPrincipals={defaultPrincipals}
          onChange={handleChange}
          onBlur={(field) => setVisited((current) => new Set(current).add(field))}
        />
      )}
    </ModalDialog>
  );
}
