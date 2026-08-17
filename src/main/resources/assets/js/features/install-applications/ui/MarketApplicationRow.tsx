import { cn, Tooltip } from '@enonic/ui';

import { ApplicationIcon } from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { ItemLabel } from '../../../shared/ui/ItemLabel';
import { ProgressButton } from '../../../shared/ui/ProgressButton';
import type { MarketInstall } from '../model/install.store';
import { canInstall, type MarketRow } from '../model/market-rows';
import {
  MARKET_ACTION_CELL_CLASS,
  MARKET_GRID_CLASS,
  MARKET_VERSION_CELL_CLASS,
} from './market-grid';

export type MarketApplicationRowProps = {
  row: MarketRow;
  install?: MarketInstall;
  onInstall: (row: MarketRow) => void;
};

const TOOLTIP_DELAY = 300;

/** One market entry: what it is, what versions there are of it, and what can be done with it. */
export function MarketApplicationRow({ row, install, onInstall }: MarketApplicationRowProps) {
  const installLabel = useI18n('applications.dialog.install.install');
  const updateLabel = useI18n('applications.dialog.install.update');
  const installedLabel = useI18n('applications.dialog.install.installed');
  const marketLinkLabel = useI18n('applications.details.marketLink');

  const installing = install != null;

  return (
    <div role="row" className={cn(MARKET_GRID_CLASS, 'min-h-12 py-2')}>
      {/* App info */}
      <div role="cell" className="min-w-0">
        <ItemLabel
          icon={<ApplicationIcon icon={row.iconUrl} />}
          primary={row.displayName}
          secondary={row.description}
        />
      </div>

      {/* Installed */}
      <span role="cell" className={MARKET_VERSION_CELL_CLASS}>
        {row.installedVersion}
      </span>

      {/* Available */}
      <span role="cell" className={MARKET_VERSION_CELL_CLASS}>
        {row.pageUrl == null ? (
          row.availableVersion
        ) : (
          <Tooltip value={marketLinkLabel} side="top" delay={TOOLTIP_DELAY} asChild>
            <a
              href={row.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-main-hover hover:underline"
              aria-label={marketLinkLabel}
            >
              {row.availableVersion}
            </a>
          </Tooltip>
        )}
      </span>

      {/* Action */}
      <div role="cell" className={MARKET_ACTION_CELL_CLASS}>
        {row.status === 'installed' && !installing && (
          <span className="text-sm opacity-30">{installedLabel}</span>
        )}
        {(canInstall(row) || installing) && (
          <ProgressButton
            variant="outline"
            size="sm"
            label={row.status === 'update' ? updateLabel : installLabel}
            progress={installing ? (install.percent ?? 0) : undefined}
            onClick={() => onInstall(row)}
            className="min-w-24"
          />
        )}
      </div>
    </div>
  );
}
