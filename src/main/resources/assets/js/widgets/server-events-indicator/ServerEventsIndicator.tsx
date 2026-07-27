import { Tooltip } from '@enonic/ui';
import { useStore } from '@nanostores/preact';

import { useI18n } from '../../shared/i18n';
import { $serverEventsConnected } from '../../shared/server-events';

export function ServerEventsIndicator() {
  const t = useI18n();
  const connected = useStore($serverEventsConnected);
  const label = connected ? t('serverEvents.connected') : t('serverEvents.disconnected');

  return (
    <Tooltip value={label} side="right" delay={300}>
      <div className="flex h-10 items-center justify-center" role="status" aria-label={label}>
        <span
          className={`size-2 rounded-full ${connected ? 'bg-fbk-success' : 'bg-bdr-strong'}`}
          aria-hidden
        />
      </div>
    </Tooltip>
  );
}
