import { SearchField } from '@enonic/ui';

import { useI18n } from '../../shared/i18n';

export type BrowseSearchProps = {
  value: string;
  onChange: (value: string) => void;
  /** Searching is not wired yet — see docs/browse-framework.md § 3.6. */
  disabled?: boolean;
};

export function BrowseSearch({ value, onChange, disabled }: BrowseSearchProps) {
  const t = useI18n();

  return (
    <SearchField
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={t('browse.search.placeholder')}
      clearLabel={t('browse.search.clear')}
      className="shrink-0"
    >
      <SearchField.Icon />
      <SearchField.Input aria-label={t('browse.search.label')} />
      <SearchField.Clear />
    </SearchField>
  );
}
