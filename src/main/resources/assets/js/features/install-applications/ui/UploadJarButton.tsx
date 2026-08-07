import { Button } from '@enonic/ui';
import { Upload } from 'lucide-react';
import { useRef } from 'preact/hooks';

import { useI18n } from '../../../shared/i18n';
import { JAR_ACCEPT } from '../model/jar-files';

export type UploadJarButtonProps = {
  onFiles: (files: readonly File[]) => void;
};

/** Picks jars off the operator's own machine. The input is the mechanism; the button is the control. */
export function UploadJarButton({ onFiles }: UploadJarButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const label = useI18n('applications.dialog.install.upload');

  const handleChange = (): void => {
    const input = inputRef.current;
    if (input?.files == null) {
      return;
    }
    onFiles([...input.files]);
    input.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={JAR_ACCEPT}
        multiple
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <Button
        variant="solid"
        size="lg"
        label={label}
        endIcon={Upload}
        onClick={() => inputRef.current?.click()}
      />
    </>
  );
}
