import { SearchField, ToggleGroup } from '@enonic/ui';

import { useI18n } from '../../../shared/i18n';
import { isMarketBucket, type MarketBucket, type MarketBucketCounts } from '../model/market-filter';

export type MarketFilterBarProps = {
  bucket: MarketBucket;
  counts: MarketBucketCounts;
  totals: MarketBucketCounts;
  query: string;
  onBucketChange: (bucket: MarketBucket) => void;
  onQueryChange: (query: string) => void;
};

/**
 * One filter: the buckets and the search that narrows them. They sit on the same row because they act
 * together — the counts on the buttons are counted over what the search left.
 */
export function MarketFilterBar({
  bucket,
  counts,
  totals,
  query,
  onBucketChange,
  onQueryChange,
}: MarketFilterBarProps) {
  const filterLabel = useI18n('applications.dialog.install.filter');
  const searchPlaceholder = useI18n('applications.dialog.install.search');
  const clearLabel = useI18n('applications.dialog.install.searchClear');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <ToggleGroup.Root
        type="single"
        value={bucket}
        aria-label={filterLabel}
        // ! An empty value is the group deselecting the pressed button, which would leave the list
        // ! narrowed by nothing at all — the guard is what keeps one bucket always on.
        // The prop type is a union over the group's two selection modes, which leaves the parameter
        // uninferred — annotated rather than cast.
        onValueChange={(next: string) => {
          if (isMarketBucket(next)) {
            onBucketChange(next);
          }
        }}
      >
        <MarketFilterButton
          value="all"
          labelKey="applications.dialog.install.filterAll"
          count={counts.all}
          total={totals.all}
        />
        <MarketFilterButton
          value="installed"
          labelKey="applications.dialog.install.filterInstalled"
          count={counts.installed}
          total={totals.installed}
        />
        <MarketFilterButton
          value="update"
          labelKey="applications.dialog.install.filterUpdate"
          count={counts.update}
          total={totals.update}
        />
      </ToggleGroup.Root>

      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder={searchPlaceholder}
        clearLabel={clearLabel}
        className="h-9 w-80"
      >
        <SearchField.Icon />
        <SearchField.Input aria-label={searchPlaceholder} />
        <SearchField.Clear />
      </SearchField>
    </div>
  );
}

// *
// * Internal
// *

/**
 * One bucket, with its count of the moment centred over an invisible copy of itself at the bucket's
 * total. The copy holds the button at its widest, so narrowing the count cannot resize the group as the
 * operator types; `tabular-nums` holds it still between counts of equal length.
 */
function MarketFilterButton({
  value,
  labelKey,
  count,
  total,
}: {
  value: MarketBucket;
  labelKey: string;
  count: number;
  total: number;
}) {
  const label = useI18n(labelKey, count);
  const widest = useI18n(labelKey, total);

  return (
    <ToggleGroup.Item value={value} variant="filled" size="sm">
      <span className="grid tabular-nums">
        <span className="invisible col-start-1 row-start-1" aria-hidden>
          {widest}
        </span>
        <span className="col-start-1 row-start-1 justify-self-center">{label}</span>
      </span>
    </ToggleGroup.Item>
  );
}
