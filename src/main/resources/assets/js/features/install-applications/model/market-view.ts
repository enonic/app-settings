import type { MarketApplication } from '../../../entities/market';
import {
  countMarketBuckets,
  filterMarketRows,
  type MarketBucket,
  type MarketBucketCounts,
} from './market-filter';
import { type MarketRow, searchMarketRows, sortMarketRows, toMarketRow } from './market-rows';

export type MarketView = {
  /** What each button reports: counted over the search result, whatever bucket is on. */
  counts: MarketBucketCounts;
  rows: MarketRow[];
};

/**
 * The catalogue as the dialog shows it, in the one order that makes the buttons agree with the list:
 * sort, search, count, then narrow to the bucket. Counting after the bucket would leave every button
 * reporting the bucket already chosen.
 *
 * It takes the applications rather than rows so a reload of the catalogue is the only input that has to
 * change for the numbers to follow.
 */
export function marketView(
  applications: readonly MarketApplication[],
  query: string,
  bucket: MarketBucket,
): MarketView {
  const searched = searchMarketRows(sortMarketRows(applications.map(toMarketRow)), query);

  return {
    counts: countMarketBuckets(searched),
    rows: filterMarketRows(searched, bucket),
  };
}
