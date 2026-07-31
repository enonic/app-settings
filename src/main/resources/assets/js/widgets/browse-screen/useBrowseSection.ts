import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import type { SearchStore } from '../../shared/search';
import type { SelectionStore } from '../../shared/selection';
import { useActiveKey } from '../browse-layout/useActiveKey';
import { type BrowseListStatus, type BrowseRow, shownRowKey } from '../browse-list/browse-list';
import type { ActionContext } from '../browse-toolbar/actions';

export type BrowseSectionOptions<T extends { key: string }> = {
  /**
   * Navigation, which stays with the page: the router types a route's params against its own
   * literal path, so a widget cannot navigate to `'/{section}/$id'` for every section. Both go
   * through `replace` — the active row moves with the arrow keys too, and every step would
   * otherwise land in the history.
   */
  openItem: (key: string) => void;
  closeItem: () => void;
  items: readonly T[];
  status: BrowseListStatus;
  /** The section's own stores, from `pages/<section>/model/`. */
  selection: SelectionStore;
  search: SearchStore;
  /** Section-specific pure functions. */
  filter: (items: readonly T[], query: string) => T[];
  toRow: (item: T) => BrowseRow;
  reload: () => void;
};

export type BrowseSection<T> = {
  rows: readonly BrowseRow[];
  status: BrowseListStatus;
  activeKey: string | undefined;
  selectedKeys: ReadonlySet<string>;
  query: string;
  context: ActionContext<T>;
  onQueryChange: (query: string) => void;
  onSelectionChange: (keys: ReadonlySet<string>) => void;
  onActiveChange: (key: string | undefined) => void;
  onRefresh: () => void;
};

/**
 * Everything `BrowseScreen` needs, derived from a section's items and its own stores: rows, the
 * action context, and the handlers behind refresh, selection and the active row. A section keeps
 * only what is genuinely its own — its data, its mappers, its actions.
 */
export function useBrowseSection<T extends { key: string }>({
  openItem,
  closeItem,
  items,
  status,
  selection,
  search,
  filter,
  toRow,
  reload,
}: BrowseSectionOptions<T>): BrowseSection<T> {
  const selectedKeys = useStore(selection.$selected);
  const query = useStore(search.$query);
  const activeKey = useActiveKey();

  useEffect(() => {
    return () => {
      selection.clear();
      search.clear();
    };
    // ? The stores outlive the page, so the cleanup only has to run when it unmounts.
  }, []);

  const visible = filter(items, query);

  return {
    rows: visible.map(toRow),
    status,
    activeKey,
    selectedKeys,
    query,
    context: {
      // ! Only the ticks on screen: a query hides rows without unticking them, and an action must
      // ! never reach a row the user cannot see. Content Studio scopes the same way, through its
      // ! loadedSelectionCount. The hidden ticks stay in the store and come back with the query.
      selected: visible.filter(({ key }) => selectedKeys.has(key)),
      active: items.find(({ key }) => key === activeKey),
    },
    onQueryChange: search.set,
    onSelectionChange: (keys) => {
      selection.replace([...keys]);

      // The details column follows the selection: it stays on a row that is ticked, and moves to
      // the row ticked last when it is not. Ticking therefore never leaves it on a row from before.
      const shown = shownRowKey(keys, activeKey);
      if (shown !== undefined && shown !== activeKey) {
        openItem(shown);
      }
    },
    onActiveChange: (key) => {
      if (key === undefined) {
        closeItem();
        return;
      }

      openItem(key);
    },
    onRefresh: () => {
      selection.clear();
      reload();
    },
  };
}
