import { useEffect, useRef, useState } from 'preact/hooks';

import { useI18n } from '../../shared/i18n';
import { mountSection, type RoutedHost } from '../../shared/sections';

export type SectionMountProps = {
  /** The section's key, on the shadow host as `data-section` — how a test picks this mount. */
  sectionKey: string;
  /** The section module's url: the extension prefix plus the contract-fixed entry path. */
  moduleUrl: string;
  /** Handed to `mount`, and stable per mount: a new object remounts the section. */
  host: RoutedHost;
  /** Hidden, not unmounted: the DOM and the state inside it are what keep-alive is for. */
  hidden?: boolean;
  /** Runs after the guest's own unmount returned — where the caller revokes the host. */
  onDisposed?: () => void;
  'data-component'?: string;
};

const SECTION_MOUNT_NAME = 'SectionMount';

export function SectionMount({
  sectionKey,
  moduleUrl,
  host,
  hidden = false,
  onDisposed,
  'data-component': componentName = SECTION_MOUNT_NAME,
}: SectionMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const failedLabel = useI18n('sectionMount.failed');

  useEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }

    setFailed(false);

    const dispose = mountSection({
      moduleUrl,
      element,
      host,
      onFail: () => setFailed(true),
    });

    // ! The guest unmounts first, then the host is released — the contract keeps the host valid
    // ! until unmount, so a teardown toast or navigation still lands.
    return () => {
      dispose();
      onDisposed?.();
    };
  }, [moduleUrl, host, onDisposed]);

  // ! The shadow host stays mounted whatever the state: rendering a message instead of it would drop
  // ! the ref, and nothing could mount afterwards.
  return (
    <div className={hidden ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
      {failed && (
        <div className="text-subtle p-10" role="alert">
          {failedLabel}
        </div>
      )}

      {/* ? The test attributes sit on the shadow host, not the wrapper: XPath stops at the shadow
          boundary, so a test finds this element and pierces its root from here. */}
      <div
        ref={ref}
        data-component={componentName}
        data-section={sectionKey}
        data-status={hidden ? undefined : 'active'}
        className="flex min-h-0 flex-1 flex-col"
      />
    </div>
  );
}

SectionMount.displayName = SECTION_MOUNT_NAME;
