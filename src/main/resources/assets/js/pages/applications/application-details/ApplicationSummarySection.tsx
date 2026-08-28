import { Link } from '@enonic/ui';

import type { Application } from '../../../entities/application';
import { i18n, useI18n } from '../../../shared/i18n';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { systemVersionPhrase } from '../model/application-details';
import { ApplicationUpdateField } from './ApplicationUpdateField';

export type ApplicationSummarySectionProps = {
  application: Application;
};

export function ApplicationSummarySection({ application }: ApplicationSummarySectionProps) {
  const { key, description, version, minSystemVersion, maxSystemVersion, vendorName, vendorUrl } =
    application;

  const vendorLinkLabel = useI18n('applications.details.vendorLink');
  const systemVersion = systemVersionPhrase(minSystemVersion, maxSystemVersion);

  return (
    <DetailsPanel.Section labelKey="applications.details.application">
      {description !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.info">{description}</DetailsPanel.Field>
      )}

      {version !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.version">{version}</DetailsPanel.Field>
      )}

      <ApplicationUpdateField application={application} />

      <DetailsPanel.Field labelKey="applications.details.key">{key}</DetailsPanel.Field>

      {vendorName !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.vendor">
          {/* TODO: Restore against app-applications' `config.managedMode` — managed mode shows no
              TODO: links out. It read:
              TODO:   {vendorUrl === undefined || isAppsManagedMode() ? ( */}
          {vendorUrl === undefined ? (
            vendorName
          ) : (
            <span className="inline-flex items-center gap-1">
              {vendorName}
              <Link href={vendorUrl} newTab rightIcon aria-label={vendorLinkLabel} />
            </span>
          )}
        </DetailsPanel.Field>
      )}

      {systemVersion !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.systemRequired">
          {i18n(systemVersion.labelKey, ...systemVersion.args)}
        </DetailsPanel.Field>
      )}
    </DetailsPanel.Section>
  );
}
