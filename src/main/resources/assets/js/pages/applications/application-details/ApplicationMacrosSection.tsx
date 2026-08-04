import type { ApplicationInfo } from '../../../entities/application';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { byName } from '../model/application-items';

export type ApplicationMacrosSectionProps = {
  info?: ApplicationInfo;
};

export function ApplicationMacrosSection({ info }: ApplicationMacrosSectionProps) {
  const macros = byName(info?.macros ?? []);

  if (macros.length === 0) {
    return null;
  }

  return (
    <DetailsPanel.Section labelKey="applications.details.macros">
      <DetailsPanel.Subsection labelKey="applications.details.name">
        <div className="flex flex-col gap-1">
          {macros.map(({ key, name }) => (
            <span key={key} className="text-xs wrap-anywhere">
              {name}
            </span>
          ))}
        </div>
      </DetailsPanel.Subsection>
    </DetailsPanel.Section>
  );
}
