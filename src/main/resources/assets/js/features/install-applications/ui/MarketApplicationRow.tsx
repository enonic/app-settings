import { ListItem } from '@enonic/ui';

import { ApplicationIcon } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { ProgressButton } from '../../../shared/ui/ProgressButton';
import type { MarketInstall } from '../model/install.store';
import { canInstall, type MarketRow, marketStatusLabelKey } from '../model/market-rows';
import { MarketApplicationVersions } from './MarketApplicationVersions';

export type MarketApplicationRowProps = {
  row: MarketRow;
  install?: MarketInstall;
  onInstall: (row: MarketRow) => void;
};

/** One market entry: what it is, what version is on offer, and what can be done with it. */
export function MarketApplicationRow({ row, install, onInstall }: MarketApplicationRowProps) {
  const actionLabel = useI18n(marketStatusLabelKey(row.status));

  return (
    <ListItem className="py-2">
      <ListItem.Left>
        <ApplicationIcon icon={row.iconUrl} />
      </ListItem.Left>

      <ListItem.DefaultContent label={row.displayName} description={row.description} />

      <ListItem.Right>
        <MarketApplicationVersions
          available={row.availableVersion}
          installed={row.installedVersion}
        />

        <ProgressButton
          variant="outline"
          label={actionLabel}
          progress={install == null ? undefined : (install.percent ?? 0)}
          disabled={!canInstall(row)}
          onClick={() => onInstall(row)}
          className="min-w-24"
        />
      </ListItem.Right>
    </ListItem>
  );
}
