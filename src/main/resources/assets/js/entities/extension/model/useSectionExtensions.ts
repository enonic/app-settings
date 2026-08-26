import { useStore } from '@nanostores/preact';

import { $sectionExtensions, type SectionExtensionsState } from './extensions.store';

export function useSectionExtensions(): SectionExtensionsState {
  return useStore($sectionExtensions);
}
