import type { ApplicationInfo } from '../../../entities/application';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { siteGroups } from '../model/application-site';

export type ApplicationSiteSectionProps = {
  info?: ApplicationInfo;
};

export function ApplicationSiteSection({ info }: ApplicationSiteSectionProps) {
  const groups = siteGroups(info);

  if (groups.length === 0) {
    return null;
  }

  return (
    <DetailsPanel.Section labelKey="applications.details.site">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-6">
        {groups.map(({ labelKey, items }) => (
          <DetailsPanel.Subsection key={labelKey} labelKey={labelKey}>
            <div className="flex flex-col gap-1">
              {items.map(({ key, name }) => (
                <span key={key} className="text-xs wrap-anywhere">
                  {name}
                </span>
              ))}
            </div>
          </DetailsPanel.Subsection>
        ))}
      </div>
    </DetailsPanel.Section>
  );
}
