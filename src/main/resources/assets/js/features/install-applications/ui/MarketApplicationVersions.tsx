import { useI18n } from '../../../shared/i18n';

export type MarketApplicationVersionsProps = {
  available: string;
  installed?: string;
};

/**
 * The version cell of a market row: the mirror of `ApplicationVersions`, which leads with the
 * installed version because its list is what this instance has.
 */
export function MarketApplicationVersions({
  available,
  installed,
}: MarketApplicationVersionsProps) {
  const availableLabel = useI18n('applications.row.available', available);
  const installedLabel = useI18n('applications.row.installed', installed ?? '');

  return (
    <span className="text-subtle flex flex-col items-end text-sm leading-tight">
      <span>{availableLabel}</span>
      {installed && <span>({installedLabel})</span>}
    </span>
  );
}
