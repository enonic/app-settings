import { Link } from '@enonic/ui';

import type { Application } from '../../../entities/application';
import { formatDateTime } from '../../../shared/format';
import { i18n } from '../../../shared/i18n';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { systemVersionPhrase } from '../model/application-details';

export type ApplicationSummarySectionProps = {
  application: Application;
};

// TODO: [#3] The available version and its update button need the market call — § 5.8 of
// docs/browse-framework.md.
export function ApplicationSummarySection({ application }: ApplicationSummarySectionProps) {
  const { key, version, modifiedTime, minSystemVersion, maxSystemVersion, vendorName, vendorUrl } =
    application;
  const systemVersion = systemVersionPhrase(minSystemVersion, maxSystemVersion);

  return (
    <DetailsPanel.Section labelKey="applications.details.application">
      {modifiedTime !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.installed">
          {formatDateTime(modifiedTime)}
        </DetailsPanel.Field>
      )}

      {version !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.version">{version}</DetailsPanel.Field>
      )}

      <DetailsPanel.Field labelKey="applications.details.key">{key}</DetailsPanel.Field>

      {vendorName !== undefined && (
        <DetailsPanel.Field labelKey="applications.details.vendor">
          {vendorUrl === undefined ? (
            vendorName
          ) : (
            <Link href={vendorUrl} newTab>
              {vendorName}
            </Link>
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
