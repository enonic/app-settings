import type { ApplicationInfo, ApplicationItem } from '../../../entities/application';
import { filledSections } from '../../../widgets/details-panel/details-panel';
import { byName } from './application-items';

const TEXT = {
  contentTypes: 'applications.details.contentTypes',
  pages: 'applications.details.pages',
  parts: 'applications.details.parts',
  layouts: 'applications.details.layouts',
  mixins: 'applications.details.mixins',
  formFragments: 'applications.details.formFragments',
} as const;

export type SiteItemGroup = {
  labelKey: string;
  items: readonly ApplicationItem[];
};

/** The site components an application contributes, in mockup order, groups with nothing in them dropped. */
export function siteGroups(info: ApplicationInfo | undefined): SiteItemGroup[] {
  if (info == null) {
    return [];
  }

  return filledSections([
    { labelKey: TEXT.contentTypes, items: byName(info.contentTypes) },
    { labelKey: TEXT.pages, items: byName(info.pages) },
    { labelKey: TEXT.parts, items: byName(info.parts) },
    { labelKey: TEXT.layouts, items: byName(info.layouts) },
    { labelKey: TEXT.mixins, items: byName(info.mixins) },
    { labelKey: TEXT.formFragments, items: byName(info.formFragments) },
  ]);
}
