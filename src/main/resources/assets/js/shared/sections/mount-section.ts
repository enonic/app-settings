import type { Host, MountOptions, Unmount } from './contract';
import { isSectionModule } from './section-module';
import { openShadowContainer } from './shadow-container';

/** A module that never arrives must not leave a skeleton on screen for ever. */
const IMPORT_TIMEOUT_MS = 15000;

export type MountSectionOptions = {
  /** The module's url: the extension prefix plus the contract-fixed entry path. */
  moduleUrl: string;
  /** The element the shadow root is opened on. The caller owns it and keeps it mounted. */
  element: HTMLElement;
  host: Host;
  /** Both injectable so the sequence can be tested without a browser. */
  importModule?: (url: string) => Promise<unknown>;
  openContainer?: (element: HTMLElement) => HTMLElement;
  timeoutMs?: number;
  /** The section cannot be shown. Which stage failed is already in the console. */
  onFail?: () => void;
};

/**
 * Brings a section in: opens its shadow root, imports its module and mounts it. Answers with the
 * disposer for that mount: idempotent, never throwing, and safe to call while the import is still in
 * flight. Styling is the guest's own — it adopts its stylesheet into the root it is handed.
 */
export function mountSection({
  moduleUrl,
  element,
  host,
  // ? @vite-ignore: the specifier is a runtime url, and rolldown would otherwise try to resolve it
  // ? at build time.
  importModule = (url) => import(/* @vite-ignore */ url),
  openContainer = openShadowContainer,
  timeoutMs = IMPORT_TIMEOUT_MS,
  onFail,
}: MountSectionOptions): () => void {
  let disposed = false;
  let unmount: Unmount | undefined;

  const container = openContainer(element);

  void (async () => {
    let loaded: unknown;

    try {
      loaded = await withTimeout(importModule(moduleUrl), timeoutMs);
    } catch (cause) {
      fail('could not be imported', cause);
      return;
    }

    // ! Leaving the section while its module was loading must not mount it into a root the shell
    // ! has moved on from.
    if (disposed) {
      return;
    }

    if (!isSectionModule(loaded)) {
      fail('exports no mount function');
      return;
    }

    try {
      unmount = loaded.mount({ container, host } satisfies MountOptions);
    } catch (cause) {
      fail('threw while mounting', cause);
    }
  })();

  /** The stage goes to the console, because which gate failed is a developer's question. */
  function fail(stage: string, cause?: unknown): void {
    console.error(`Section ${moduleUrl} ${stage}:`, cause);

    if (!disposed) {
      onFail?.();
    }
  }

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;

    // ! The contract says unmount is idempotent and must not throw; a guest that throws anyway must
    // ! not take the shell down with it.
    try {
      unmount?.();
    } catch (cause) {
      console.error(`Section ${moduleUrl} threw while unmounting:`, cause);
    } finally {
      unmount = undefined;
    }
  };
}

//
// * Internal
//

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer in ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
