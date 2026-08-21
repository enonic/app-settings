import { map } from 'nanostores';
import type { Result } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import type { SectionExtension } from './extension.types';

export type SectionExtensionsState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly SectionExtension[];
  error?: string;
};

export const $sectionExtensions = map<SectionExtensionsState>({ status: 'loading', items: [] });

/** A rediscovery must not empty the rail it is refreshing, so `loading` is for the first one only. */
export function beginSectionExtensionsLoad(): void {
  if ($sectionExtensions.get().items.length === 0) {
    $sectionExtensions.setKey('status', 'loading');
  }
}

export function receiveSectionExtensions(result: Result<SectionExtension[], AppError>): void {
  result.match(
    (items) => $sectionExtensions.set({ status: 'ready', items }),
    (error) => $sectionExtensions.set({ status: 'error', items: [], error: error.message }),
  );
}
