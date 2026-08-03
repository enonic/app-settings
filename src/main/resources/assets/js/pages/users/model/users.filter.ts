import type { IdProvider } from '../../../entities/principal';
import type { BrowseFilterEntry } from '../../../widgets/browse-list/browse-filter';

/**
 * One filter entry per id provider, ordered the way the provider list is.
 *
 * ! Unlike the other sections, the entries do not come from the rows and carry no count. The rows are one
 * ! page of a server-side search, so a provider missing from this page must still be offered; and
 * ! `findUsers` reports one total for the whole query, with nothing per provider — the counts would each
 * ! be a request of their own.
 *
 * There is no search helper beside this one: `findUsers` does the matching, so nothing filters on the
 * client. See `pages/users/model/query.store.ts` for what is asked of the server instead.
 */
export function providerEntries(providers: readonly IdProvider[]): BrowseFilterEntry[] {
  return providers.map(({ key, displayName }) => ({ id: key, label: displayName }));
}
