import { Button, FilledSquareCheck, Menu } from '@enonic/ui';
import { Filter, Square } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import type { BrowseFilterEntry } from './browse-filter';

export type BrowseFilterProps = {
  entries: readonly BrowseFilterEntry[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Shown under the entries when some of them could not be loaded, so a short list reads as such. */
  notice?: string;
};

/**
 * The `Filter list` control: a multi-select over entries a section supplies, each with a count.
 * Section-agnostic by construction — an entry is a label and a number, and what it stands for is the
 * page's business.
 */
export function BrowseFilter({ entries, selected, onToggle, notice }: BrowseFilterProps) {
  const t = useI18n();

  if (entries.length === 0 && notice === undefined) {
    return (
      <Button
        variant="text"
        startIcon={Filter}
        label={t('browse.filter')}
        disabled
        className="px-4.5"
      />
    );
  }

  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="text" startIcon={Filter} label={t('browse.filter')} className="px-4.5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" className="min-w-56">
          {entries.map(({ id, label, count }) => {
            const ticked = selected.has(id);
            const Indicator = ticked ? FilledSquareCheck : Square;

            return (
              <Menu.Item
                key={id}
                // The row itself is the control, so it carries the state a checkbox would.
                role="menuitemcheckbox"
                aria-checked={ticked}
                // ! Without preventDefault the menu closes on every tick — Menu.Item calls setOpen(false)
                // ! unless the select event is cancelled, and a multi-select has to survive several.
                onSelect={(event) => {
                  event.preventDefault();
                  onToggle(id);
                }}
              >
                <span className="flex w-full items-center gap-2">
                  {/* ! The box is drawn, not composed: `Checkbox` renders `readOnly` as `disabled`
                      ! plus `opacity-30`, so every entry would read as unavailable, and its label
                      ! wraps an input whose click would reach `onSelect` a second time. */}
                  <Indicator className="text-main size-4 shrink-0 rounded-sm" aria-hidden />
                  <span className="grow truncate">{label}</span>
                  <span className="text-subtle tabular-nums">{count}</span>
                </span>
              </Menu.Item>
            );
          })}
          {notice !== undefined && <Menu.Label className="text-subtle">{notice}</Menu.Label>}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
