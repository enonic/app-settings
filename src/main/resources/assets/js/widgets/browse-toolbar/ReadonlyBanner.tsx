import { useI18n } from '../../shared/i18n';

/**
 * Managed mode, stated where the action row would be: the tool shows what is installed and offers
 * nothing that changes it.
 */
export function ReadonlyBanner() {
  const title = useI18n('browse.readonly.title');
  const help = useI18n('browse.readonly.help');

  return (
    <div className="bg-muted border-bdr-soft flex h-11 shrink-0 items-center justify-center gap-2 border-b px-5 text-sm">
      <span className="shrink-0 font-semibold">{title}</span>
      <span className="text-subtle truncate">{help}</span>
    </div>
  );
}
