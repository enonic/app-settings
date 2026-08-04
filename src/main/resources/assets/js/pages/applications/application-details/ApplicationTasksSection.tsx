import { Fragment } from 'preact';

import type { ApplicationInfo } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { byName } from '../model/application-items';

export type ApplicationTasksSectionProps = {
  info?: ApplicationInfo;
};

export function ApplicationTasksSection({ info }: ApplicationTasksSectionProps) {
  const t = useI18n();

  const tasks = byName(info?.tasks ?? []);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <DetailsPanel.Section labelKey="applications.details.tasks">
      {/* ! One grid rather than a column per field: two independent lists stop lining up as soon as
          a description wraps, and then a key sits next to another task's description. */}
      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <h4 className="text-sm font-semibold">{t('applications.details.key')}</h4>
        <h4 className="text-sm font-semibold">{t('applications.details.description')}</h4>

        {tasks.map(({ key, description }) => (
          <Fragment key={key}>
            <span className="text-xs wrap-anywhere">{key}</span>
            <span className="text-xs wrap-anywhere">{description}</span>
          </Fragment>
        ))}
      </div>
    </DetailsPanel.Section>
  );
}
