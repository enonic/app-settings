import { useEffect, useRef, useState } from 'preact/hooks';

import { useI18n } from '../../shared/i18n';
import type { Host, MountOptions, SectionModule, Unmount } from '../../shared/section-contract';

export type SectionHostProps = {
  /** The section module's url: the extension prefix plus the contract-fixed entry path. */
  url: string;
  /** Handed to `mount`, and stable per mount: a new object remounts the section. */
  host: Host;
};

export function SectionHost({ url, host }: SectionHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const failedLabel = useI18n('sectionHost.failed');

  useEffect(() => {
    const container = ref.current;
    if (container == null) {
      return;
    }

    // ! Leaving the section while its module is still loading must not mount it into a container the
    // ! shell has moved on from.
    let aborted = false;
    let unmount: Unmount | undefined;

    setFailed(false);

    void (async () => {
      let loaded: unknown;

      try {
        // ? @vite-ignore: the specifier is a runtime url, and rolldown would otherwise try to
        // ? resolve it at build time.
        loaded = await import(/* @vite-ignore */ url);
      } catch (cause) {
        report('could not be imported', cause);
        return;
      }

      if (aborted) {
        return;
      }

      if (!isSectionModule(loaded)) {
        report('exports no mount function');
        return;
      }

      try {
        unmount = loaded.mount({ container, host } satisfies MountOptions);
      } catch (cause) {
        report('threw while mounting', cause);
      }
    })();

    /** One phrase on screen, the stage in the console: which gate failed is a developer's question. */
    function report(stage: string, cause?: unknown): void {
      console.error(`Section ${url} ${stage}:`, cause);

      if (!aborted) {
        setFailed(true);
      }
    }

    return () => {
      aborted = true;

      // ! The contract says unmount is idempotent and must not throw; a guest that throws anyway
      // ! must not take the shell down with it.
      try {
        unmount?.();
      } catch (cause) {
        console.error(`Section ${url} threw while unmounting:`, cause);
      }
    };
  }, [url, host]);

  // ! The container stays mounted whatever the state: rendering the failure instead of it would drop
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

//
// * Internal
//

function isSectionModule(value: unknown): value is SectionModule {
  return value != null && typeof (value as SectionModule).mount === 'function';
}
