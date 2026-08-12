import { Tooltip } from '@enonic/ui';
import { ExternalLink } from 'lucide-react';

import { type Application, ApplicationIcon } from '../../../entities/application';
import { useMarketApplication } from '../../../entities/market';
import { useI18n } from '../../../shared/i18n';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { ApplicationStateMenu } from './ApplicationStateMenu';

export type ApplicationDetailsHeaderProps = {
  application: Application;
};

const TOOLTIP_DELAY = 300;

export function ApplicationDetailsHeader({ application }: ApplicationDetailsHeaderProps) {
  // Absent for an application the market does not carry, and while the catalogue is still loading —
  // both mean no link rather than an empty one.
  const { marketApplication } = useMarketApplication(application.key);
  const marketLinkLabel = useI18n('applications.details.marketLink');

  const pageUrl = marketApplication?.pageUrl;

  return (
    <DetailsPanel.Header
      icon={
        <ApplicationIcon
          icon={application.icon}
          size="lg"
          system={application.system}
          local={application.local}
        />
      }
      title={application.displayName}
      titleAction={
        pageUrl != null && (
          <Tooltip value={marketLinkLabel} side="top" delay={TOOLTIP_DELAY} asChild>
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={marketLinkLabel}
              className="text-subtle hover:text-main-hover shrink-0"
            >
              <ExternalLink className="size-4.5" strokeWidth={1.5} aria-hidden />
            </a>
          </Tooltip>
        )
      }
      action={<ApplicationStateMenu application={application} />}
    />
  );
}
