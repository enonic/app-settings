import type { ApplicationInfo, ApplicationItem } from '../../../entities/application';
import { filledSections } from '../../../widgets/details-panel/details-panel';
import { byName } from './application-items';

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
    { labelKey: 'applications.details.contentTypes', items: byName(info.contentTypes) },
    { labelKey: 'applications.details.pages', items: byName(info.pages) },
    { labelKey: 'applications.details.parts', items: byName(info.parts) },
    { labelKey: 'applications.details.layouts', items: byName(info.layouts) },
    { labelKey: 'applications.details.mixins', items: byName(info.mixins) },
    { labelKey: 'applications.details.formFragments', items: byName(info.formFragments) },
  ]);
}
