import { Button, cn, Skeleton } from '@enonic/ui';

import type { MarketApplicationsState } from '../../../entities/market';
import { useI18n } from '../../../shared/i18n';
import type { MarketInstall } from '../model/install.store';
import type { MarketRow } from '../model/market-rows';
import { MarketApplicationListHeader } from './MarketApplicationListHeader';
import { MarketApplicationRow } from './MarketApplicationRow';

export type MarketApplicationListProps = {
  status: MarketApplicationsState['status'];
  rows: readonly MarketRow[];
  /** Whether the search or the bucket narrowed the list — an empty result then means no match, not an
   * empty catalogue. */
  narrowed: boolean;
  installs: Readonly<Record<string, MarketInstall>>;
  onInstall: (row: MarketRow) => void;
  onRetry: () => void;
};

const SKELETON_ROWS = 8;

/**
 * The one grid the header, the rows and the skeleton are laid out on. Widths are fixed rather than
 * content-sized: `auto` columns are measured per grid, so every row would find its own widths and the
 * header would stand over none of them. Safe here because the dialog is a fixed `max-w-5xl`.
 */
export const MARKET_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)_7.5rem_7rem_7rem] items-center gap-2.5 px-2.5';

/** Wide enough for `6.1.0.SNAPSHOT`, which is what a dev build puts in the installed column. */
export const MARKET_VERSION_CELL_CLASS = 'text-subtle justify-self-end text-sm whitespace-nowrap';

export const MARKET_ACTION_CELL_CLASS = 'flex justify-center';

/** What Enonic Market offers, or why there is nothing to offer. */
export function MarketApplicationList({
  status,
  rows,
  narrowed,
  installs,
  onInstall,
  onRetry,
}: MarketApplicationListProps) {
  const errorLabel = useI18n('applications.dialog.install.error');
  const emptyLabel = useI18n('applications.dialog.install.empty');
  const noMatchesLabel = useI18n('applications.dialog.install.noMatches');
  const retryLabel = useI18n('applications.dialog.install.retry');

  if (status === 'loading') {
    return (
      <div role="table" aria-busy="true">
        <MarketApplicationListHeader />

        <div role="rowgroup" className="pt-3">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton.Group key={index} className={cn(MARKET_GRID_CLASS, 'min-h-12 py-2')}>
              <div className="flex min-w-0 items-center gap-2.5">
                <Skeleton shape="rectangle" className="size-6 shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton shape="rectangle" className="h-5 w-36" />
                  <Skeleton shape="rectangle" className="h-4 w-24" />
                </div>
              </div>
              <Skeleton shape="rectangle" className={cn(MARKET_VERSION_CELL_CLASS, 'h-4 w-12')} />
              <Skeleton shape="rectangle" className={cn(MARKET_VERSION_CELL_CLASS, 'h-4 w-12')} />
              <div className={MARKET_ACTION_CELL_CLASS}>
                <Skeleton shape="rectangle" className="h-9 w-24" />
              </div>
            </Skeleton.Group>
          ))}
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p role="alert" className="text-error text-sm">
          {errorLabel}
        </p>
        <Button variant="outline" label={retryLabel} onClick={onRetry} />
      </div>
    );
  }

  if (rows.length === 0 && narrowed) {
    return <p className="text-subtle px-2.5 py-10 text-center text-sm">{noMatchesLabel}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-subtle text-sm">{emptyLabel}</p>
        <Button variant="outline" label={retryLabel} onClick={onRetry} />
      </div>
    );
  }

  return (
    <div role="table">
      <MarketApplicationListHeader />

      <div role="rowgroup" className="pt-3">
        {rows.map((row) => (
          <MarketApplicationRow
            key={row.key}
            row={row}
            install={installs[row.key]}
            onInstall={onInstall}
          />
        ))}
      </div>
    </div>
  );
}
