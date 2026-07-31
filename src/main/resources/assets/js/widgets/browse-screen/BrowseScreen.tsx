import type { ReactNode } from 'react';

import { useI18n } from '../../shared/i18n';
import { BrowseLayout } from '../browse-layout/BrowseLayout';
import {
  type BrowseListStatus,
  type BrowseRow,
  selectableKeys,
  selectAllState,
} from '../browse-list/browse-list';
import { BrowseList } from '../browse-list/BrowseList';
import { BrowseListContextMenu } from '../browse-list/BrowseListContextMenu';
import { BrowseListHeader } from '../browse-list/BrowseListHeader';
import { BrowseSearch } from '../browse-search/BrowseSearch';
import type { ActionContext, SectionAction } from '../browse-toolbar/actions';
import { BrowseToolbar } from '../browse-toolbar/BrowseToolbar';

export type BrowseScreenProps<T> = {
  actions: readonly SectionAction<T>[];
  context: ActionContext<T>;
  rows: readonly BrowseRow[];
  status: BrowseListStatus;
  activeKey?: string;
  selectedKeys: ReadonlySet<string>;
  query: string;
  /** Shown when the section itself is empty; a query with no match says so on its own. */
  emptyLabel: string;
  /** The details column, normally the section's `<Outlet />`. */
  details: ReactNode;
  onQueryChange: (query: string) => void;
  onSelectionChange: (keys: ReadonlySet<string>) => void;
  onActiveChange: (key: string | undefined) => void;
  onRefresh: () => void;
  filter?: ReactNode;
  sort?: ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

/**
 * The whole browse screen, so a section states its data and its actions and nothing else. Every
 * section renders the same toolbar, search, header, list and details column, wired the same way —
 * the wiring is here rather than copied per section, which is what kept the two first sections
 * identical below the props.
 */
export function BrowseScreen<T>({
  actions,
  context,
  rows,
  status,
  activeKey,
  selectedKeys,
  query,
  emptyLabel,
  details,
  onQueryChange,
  onSelectionChange,
  onActiveChange,
  onRefresh,
  filter,
  sort,
  hasMore,
  onLoadMore,
}: BrowseScreenProps<T>) {
  const t = useI18n();

  const handleSelectAllChange = (checked: boolean): void => {
    onSelectionChange(checked ? new Set(selectableKeys(rows)) : new Set());
  };

  return (
    <BrowseLayout
      toolbar={<BrowseToolbar actions={actions} context={context} />}
      list={
        <>
          <BrowseSearch value={query} onChange={onQueryChange} />

          <BrowseListHeader
            allSelected={selectAllState(rows, selectedKeys)}
            onSelectAllChange={handleSelectAllChange}
            onRefresh={onRefresh}
            filter={filter}
            sort={sort}
          />

          <BrowseListContextMenu actions={actions} context={context}>
            <BrowseList
              rows={rows}
              activeKey={activeKey}
              selectedKeys={selectedKeys}
              onSelectionChange={onSelectionChange}
              onActiveChange={onActiveChange}
              status={status}
              emptyLabel={query.trim() ? t('browse.list.noMatches') : emptyLabel}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
            />
          </BrowseListContextMenu>
        </>
      }
      details={details}
    />
  );
}
