import { useEffect, useRef, useState } from 'preact/hooks';

import { useI18n } from '../../shared/i18n';
import { mountSection, type Host } from '../../shared/sections';

export type SectionMountProps = {
  /** The section module's url: the extension prefix plus the contract-fixed entry path. */
  moduleUrl: string;
  /** Handed to `mount`, and stable per mount: a new object remounts the section. */
  host: Host;
};

export function SectionMount({ moduleUrl, host }: SectionMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const failedLabel = useI18n('sectionMount.failed');

  useEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }

    setFailed(false);

    return mountSection({
      moduleUrl,
      element,
      host,
      onFail: () => setFailed(true),
    });
  }, [moduleUrl, host]);

  // ! The shadow host stays mounted whatever the state: rendering a message instead of it would drop
  // ! the ref, and nothing could mount afterwards.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {failed && (
        <div className="text-subtle p-10" role="alert">
          {failedLabel}
        </div>
      )}

      <div ref={ref} className="flex min-h-0 flex-1 flex-col" />
    </div>
  );
}
