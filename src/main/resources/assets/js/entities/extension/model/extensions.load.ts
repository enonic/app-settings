import { err, ok } from 'neverthrow';

import { fetchSectionExtensions } from '../api/extensions.api';
import { beginSectionExtensionsLoad, receiveSectionExtensions } from './extensions.store';

/** One domain, so the load belongs to the slice — see `.claude/rules/stores.md`. */
let pending: AbortController | undefined;

export function loadSectionExtensions(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  beginSectionExtensionsLoad();

  return fetchSectionExtensions(signal).match(
    (items) => {
      if (!signal.aborted) {
        receiveSectionExtensions(ok(items));
      }
    },
    (error) => {
      if (!signal.aborted) {
        receiveSectionExtensions(err(error));
      }
    },
  );
}
