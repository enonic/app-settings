import { useI18n } from '../../shared/i18n';

export type SectionsEmptyProps = {
  /** Why there is nothing: discovery answered with no section, or it could not be asked. */
  reason: 'none' | 'failed';
  /** The line telling a visitor what an empty rail may be down to. Ignored on a failure. */
  hint?: boolean;
};

/** The content area with no section in it — the whole screen the visitor is looking at. */
export function SectionsEmpty({ reason, hint = false }: SectionsEmptyProps) {
  const noneMessage = useI18n('sections.empty');
  const hintMessage = useI18n('sections.empty.hint');
  const failedMessage = useI18n('sections.failed');

  const failed = reason === 'failed';

  return (
    <div
      role={failed ? 'alert' : 'status'}
      className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center"
    >
      <p className="text-subtle text-base">{failed ? failedMessage : noneMessage}</p>

      {!failed && hint && <p className="text-subtle text-sm">{hintMessage}</p>}
    </div>
  );
}
