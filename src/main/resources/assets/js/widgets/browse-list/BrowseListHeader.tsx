import { Button, Checkbox } from '@enonic/ui';
import { ArrowDownUp, Filter, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { useI18n } from '../../shared/i18n';

// 18px side padding on every control in the header, checkbox included.
const BUTTON_CLASS = 'px-4.5';

export type BrowseListHeaderProps = {
  allSelected: boolean | 'indeterminate';
  onSelectAllChange: (checked: boolean) => void;
  onRefresh: () => void;
  /** Section-specific control. Undefined renders the button inert — see § 3.6 of the contract. */
  filter?: ReactNode;
  sort?: ReactNode;
};

export function BrowseListHeader({
  allSelected,
  onSelectAllChange,
  onRefresh,
  filter,
  sort,
}: BrowseListHeaderProps) {
  const t = useI18n();

  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <Checkbox
        checked={allSelected}
        label={t('browse.selectAll')}
        onCheckedChange={(checked) => onSelectAllChange(checked === true)}
        // ? Checkbox exposes no hook for its label text, so the padding is aimed at the text
        // ? span from the label class: the box itself must not move.
        // ! my-0 drops the label's own 3px margins, or the block outgrows the h-10 buttons.
        // ? pl-2.5 is the row's own px-2.5: it puts this box over the boxes in the rows.
        className="my-0 h-10 gap-0 pl-2.5 font-semibold [&>span:last-child]:px-4.5"
      />

      <div className="flex items-center gap-2.5">
        <Button
          variant="text"
          startIcon={RefreshCw}
          label={t('browse.refresh')}
          onClick={onRefresh}
          className={BUTTON_CLASS}
        />
        {filter ?? (
          <Button
            variant="text"
            startIcon={Filter}
            label={t('browse.filter')}
            disabled
            className={BUTTON_CLASS}
          />
        )}
        {sort ?? (
          <Button
            variant="text"
            startIcon={ArrowDownUp}
            label={t('browse.sort')}
            disabled
            className={BUTTON_CLASS}
          />
        )}
      </div>
    </div>
  );
}
