import { KeyRound } from 'lucide-react';

import type { PublicKey } from '../../entities/principal';
import { formatDateTime } from '../../shared/format';
import { useI18n } from '../../shared/i18n';

export type PublicKeyCardProps = {
  publicKey: PublicKey;
  detailed?: boolean;
};

export function PublicKeyCard({ publicKey, detailed }: PublicKeyCardProps) {
  const kidLabel = useI18n('users.dialog.keyKid');
  const creationLabel = useI18n('users.dialog.keyCreationTime');
  const unlabelled = useI18n('users.dialog.keyUnlabelled');

  const { kid, label, creationTime } = publicKey;

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <KeyRound size={20} strokeWidth={1.5} aria-hidden />

      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base">{label ?? unlabelled}</span>

        {detailed === true ? (
          <>
            <small className="text-subtle truncate text-sm">
              {kidLabel} {kid}
            </small>

            {creationTime !== undefined && (
              <small className="text-subtle truncate text-sm">
                {creationLabel} {formatDateTime(creationTime)}
              </small>
            )}
          </>
        ) : (
          <small className="text-subtle truncate text-sm">
            {creationTime === undefined ? kid : formatDateTime(creationTime)}
          </small>
        )}
      </span>
    </span>
  );
}
