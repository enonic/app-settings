import { Button, Input } from '@enonic/ui';
import { Upload } from 'lucide-react';
import { useState } from 'preact/hooks';

import { useI18n } from '../../shared/i18n';
import { ModalDialog } from '../../shared/ui/dialogs/ModalDialog';
import { FieldLabel } from '../../shared/ui/FieldLabel';

export type AddPublicKeyDialogProps = {
  open: boolean;
  onClose: () => void;
};

const LABEL_ID = 'public-key-label';

export function AddPublicKeyDialog({ open, onClose }: AddPublicKeyDialogProps) {
  const title = useI18n('users.dialog.addKeyTitle');
  const labelLabel = useI18n('users.dialog.keyLabel');
  const helpText = useI18n('users.dialog.addKeyHelp');
  const generateLabel = useI18n('users.dialog.generateKey');
  const uploadLabel = useI18n('users.dialog.uploadKey');
  const cancelLabel = useI18n('browse.dialog.cancel');
  const closeLabel = useI18n('browse.dialog.close');

  const [label, setLabel] = useState('');

  return (
    <ModalDialog
      open={open}
      title={title}
      primaryLabel={generateLabel}
      // TODO: [#60] Generating a pair here means storing its public half through `addPublicKey` and
      primaryDisabled
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      onClose={() => {
        setLabel('');
        onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel text={labelLabel} required htmlFor={LABEL_ID} />
          <Input
            id={LABEL_ID}
            value={label}
            onInput={({ currentTarget }) => setLabel(currentTarget.value)}
          />
        </div>

        <p className="text-subtle text-sm">{helpText}</p>

        {/* TODO: [#60] Reads a `.pem` file and sends it as the public key. */}
        <Button
          className="self-start"
          variant="outline"
          size="sm"
          endIcon={Upload}
          label={uploadLabel}
          disabled
        />
      </div>
    </ModalDialog>
  );
}
