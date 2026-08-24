/**
 * The shell's path and a section's own sub-path, in both directions. The sub-path is the guest's
 * opaque string: only its segments are routed, and its search params travel through untouched.
 */

import type { Readable } from '../../shared/sections';

/** Whether the url is inside this section, rather than merely starting like its slug. */
export function isInSection(pathname: string, slug: string): boolean {
  const prefix = `/${slug}`;

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Everything after the section's slug, search params included; empty outside the section. */
export function readSubPath(pathname: string, searchStr: string, slug: string): string {
  return isInSection(pathname, slug) ? `${pathname.slice(slug.length + 1)}${searchStr}` : '';
}

/** The shell path a section's sub-path resolves to. */
export function sectionPath(slug: string, subPath: string): string {
  const [rawPath = '', ...rest] = escapeHash(subPath).split('?');

  const segments = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');
  const search = rest.length === 0 ? '' : `?${rest.join('?')}`;

  return `/${slug}${segments === '' ? '' : `/${segments}`}${search}`;
}

export type SectionPathOptions = {
  /** The section's sub-path as the url has it now. */
  read: () => string;
  /** Whether this section is the one showing. */
  isActive: () => boolean;
  /** Every url change, whoever caused it. */
  onUrlChange: (cb: () => void) => () => void;
};

/**
 * A section's `path`, tracking the url only while that section is showing: a hidden mount is never
 * told another section's sub-path, and on being shown again it hears the url as it is by then.
 */
export function createSectionPath({
  read,
  isActive,
  onUrlChange,
}: SectionPathOptions): Readable<string> & { dispose(): void } {
  let current = isActive() ? read() : '';
  let stop: (() => void) | undefined;
  const listeners = new Set<(value: string) => void>();

  const emit = (): void => {
    if (!isActive()) {
      return;
    }

    const next = read();
    if (next === current) {
      return;
    }

    current = next;
    listeners.forEach((listener) => listener(next));
  };

  return {
    /** Beyond the contract: the shell drops the whole signal when it revokes the mount. */
    dispose: () => {
      listeners.clear();
      stop?.();
      stop = undefined;
    },
    get: () => {
      if (isActive()) {
        current = read();
      }

      return current;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      stop ??= onUrlChange(emit);

      return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
          stop?.();
          stop = undefined;
        }
      };
    },
  };
}

//
// * Internal
//

/** ! Under hash history a `#` would end the url, taking the search params with it. */
function escapeHash(subPath: string): string {
  return subPath.replace(/#/g, '%23');
}
