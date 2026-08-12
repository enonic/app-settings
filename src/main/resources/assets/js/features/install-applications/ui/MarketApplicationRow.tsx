import { cn } from '@enonic/ui';

import { ApplicationIcon } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { ItemLabel } from '../../../shared/ui/ItemLabel';
import { ProgressButton } from '../../../shared/ui/ProgressButton';
import type { MarketInstall } from '../model/install.store';
import { canInstall, type MarketRow, marketStatusLabelKey } from '../model/market-rows';
import {
  MARKET_ACTION_CELL_CLASS,
  MARKET_GRID_CLASS,
  MARKET_VERSION_CELL_CLASS,
} from './market-columns';

export type MarketApplicationRowProps = {
  row: MarketRow;
  install?: MarketInstall;
  onInstall: (row: MarketRow) => void;
};

/** One market entry: what it is, what versions there are of it, and what can be done with it. */
export function MarketApplicationRow({ row, install, onInstall }: MarketApplicationRowProps) {
  const actionLabel = useI18n(marketStatusLabelKey(row.status));

  return (
    <div role="row" className={cn(MARKET_GRID_CLASS, 'min-h-12 py-2')}>
      <div role="cell" className="min-w-0">
        <ItemLabel
          icon={<ApplicationIcon icon={row.iconUrl} />}
          primary={row.displayName}
          secondary={row.description}
        />
      </div>

      <span role="cell" className={MARKET_VERSION_CELL_CLASS}>
        {row.installedVersion}
      </span>

      <span role="cell" className={MARKET_VERSION_CELL_CLASS}>
        {row.availableVersion}
      </span>

      <div role="cell" className={MARKET_ACTION_CELL_CLASS}>
        <ProgressButton
          variant="outline"
          label={actionLabel}
          progress={install == null ? undefined : (install.percent ?? 0)}
          disabled={!canInstall(row)}
          onClick={() => onInstall(row)}
          className="min-w-24"
        />
      </div>
    </div>
  );
}
