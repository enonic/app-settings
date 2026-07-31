import { Button } from '@enonic/ui';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';

import { useI18n } from '../../shared/i18n';
import {
  type BrowseListStatus,
  type BrowseRow,
  contextMenuTarget,
  nextRowKey,
  type RowTarget,
  rowClickTarget,
  tabbableRowKey,
  toggledSelection,
} from './browse-list';
import { BrowseListMessage } from './BrowseListMessage';
import { BrowseListRow } from './BrowseListRow';
import { BrowseListSkeleton } from './BrowseListSkeleton';

export type BrowseListProps = {
  rows: readonly BrowseRow[];
  activeKey?: string;
  selectedKeys: ReadonlySet<string>;
  /** The whole selection, whether a tick, a right-click or `Space` changed it. */
  onSelectionChange: (keys: ReadonlySet<string>) => void;
  /** The row the user moved to, `undefined` when the active row was clicked again. */
  onActiveChange: (key: string | undefined) => void;
  status: BrowseListStatus;
  emptyLabel?: string;
  /** Paging is the entity store's job; the list only reports it hit the end. */
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export function BrowseList({
  rows,
  activeKey,
  selectedKeys,
  onSelectionChange,
  onActiveChange,
  status,
  emptyLabel,
  hasMore,
  onLoadMore,
}: BrowseListProps) {
  const t = useI18n();
  // ! The cursor is the row the user last pointed at — a click, an arrow, a tick, an untick — and
  // ! nothing else moves it. It starts on the row a deep link opened, and it deliberately does not
  // ! follow the details column: unticking a row moves the column to the row ticked before it, and
  // ! the focus must stay under the hand that unticked. This is Content Studio's activeId; its
  // ! details panel is the separate, derived currentItem.
  const [pointedKey, setPointedKey] = useState(activeKey);

  if (status === 'loading') {
    return <BrowseListSkeleton />;
  }

  if (status === 'error') {
    return <BrowseListMessage tone="error">{t('browse.list.error')}</BrowseListMessage>;
  }

  if (rows.length === 0) {
    return <BrowseListMessage>{emptyLabel ?? t('browse.list.empty')}</BrowseListMessage>;
  }

  // ! Resolved against the rows on screen, never the stored key alone: a query can filter the
  // ! pointed row out, and then the tab stop, the focus, the arrows and Space must all agree on
  // ! the first visible row instead of acting on a row nobody can see.
  const cursorKey = tabbableRowKey(rows, pointedKey);

  const handleSelectedChange = (key: string, checked: boolean): void => {
    // Which row the details column ends up on is `shownRowKey`, applied wherever a selection
    // change is reported — a tick, `Select all`, a right-click, `Escape` — not here.
    onSelectionChange(toggledSelection(selectedKeys, key, checked));
    setPointedKey(key);
  };

  const handleKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLDivElement>): void => {
    // ! Rows only. A click on a row checkbox leaves the focus on its hidden input, and
    // ! Space there must tick that row, not whichever row happens to be active.
    if (!(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'option') {
      return;
    }

    const nextKey = nextRowKey(rows, cursorKey, event.key);
    if (nextKey !== undefined) {
      event.preventDefault();
      setPointedKey(nextKey);

      // Nothing ticked: the cursor and the row on show are the same thing, so the details follow.
      if (selectedKeys.size === 0) {
        onActiveChange(nextKey);
      }
      return;
    }

    if (event.key === ' ' && cursorKey !== undefined) {
      event.preventDefault();
      handleSelectedChange(cursorKey, !selectedKeys.has(cursorKey));
    }
  };

  const applyRowTarget = (
    key: string,
    { clearSelection, activate, deactivate }: RowTarget,
  ): void => {
    setPointedKey(key);

    if (clearSelection) {
      onSelectionChange(new Set());
    }
    if (deactivate === true) {
      onActiveChange(undefined);
      return;
    }
    if (activate !== undefined) {
      onActiveChange(activate);
    }
  };

  const loadMore =
    hasMore && onLoadMore ? (
      <div className="flex justify-center p-2.5">
        <Button variant="filled" size="sm" label={t('browse.list.loadMore')} onClick={onLoadMore} />
      </div>
    ) : undefined;

  return (
    <div
      role="listbox"
      aria-multiselectable
      aria-label={t('browse.list.label')}
      onKeyDown={handleKeyDown}
      className="flex min-h-0 flex-1 flex-col gap-y-1.5 overflow-y-auto"
    >
      {rows.map((row) => (
        <BrowseListRow
          key={row.key}
          row={row}
          selected={selectedKeys.has(row.key)}
          focused={row.key === cursorKey}
          highlighted={
            selectedKeys.has(row.key) || (row.key === activeKey && selectedKeys.size === 0)
          }
          onSelectedChange={handleSelectedChange}
          onClick={(key) => applyRowTarget(key, rowClickTarget(key, selectedKeys, activeKey))}
          onContextMenu={(key) =>
            applyRowTarget(key, contextMenuTarget(key, selectedKeys, activeKey))
          }
        />
      ))}

      {loadMore}
    </div>
  );
}
