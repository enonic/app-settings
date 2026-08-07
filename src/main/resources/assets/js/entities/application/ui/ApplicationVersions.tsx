import { useI18n } from '../../../shared/i18n';

export type ApplicationVersionsProps = {
  installed: string;
  /** Only where the market offers something newer, so a second line means "there is an update". */
  available?: string;
};

/**
 * The version meta cell. The enclosing cell supplies the type scale and the selected-row colour, so
 * this only stacks the two lines and keeps them right-aligned with the rest of the column.
 */
export function ApplicationVersions({ installed, available }: ApplicationVersionsProps) {
  const installedLabel = useI18n('applications.row.installed', installed);
  const availableLabel = useI18n('applications.row.available', available ?? '');

  return (
    <span className="flex flex-col items-end leading-tight">
      {available ? <span>{installedLabel}</span> : <span>{installed}</span>}
      {available && <span className="text-sm">({availableLabel})</span>}
    </span>
  );
}
