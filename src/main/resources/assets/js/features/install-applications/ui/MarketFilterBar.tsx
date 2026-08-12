import { SearchField, ToggleGroup } from '@enonic/ui';

import { useI18n } from '../../../shared/i18n';
import { isMarketBucket, type MarketBucket, type MarketBucketCounts } from '../model/market-filter';

export type MarketFilterBarProps = {
  bucket: MarketBucket;
  counts: MarketBucketCounts;
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
  query,
  onBucketChange,
  onQueryChange,
}: MarketFilterBarProps) {
  const filterLabel = useI18n('applications.dialog.install.filter');
  const allLabel = useI18n('applications.dialog.install.filterAll', counts.all);
  const installedLabel = useI18n('applications.dialog.install.filterInstalled', counts.installed);
  const updateLabel = useI18n('applications.dialog.install.filterUpdate', counts.update);
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
        <ToggleGroup.Item value="all" variant="filled" size="sm" label={allLabel} />
        <ToggleGroup.Item value="installed" variant="filled" size="sm" label={installedLabel} />
        <ToggleGroup.Item value="update" variant="filled" size="sm" label={updateLabel} />
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
