import { subscribeConnection, subscribeSessionEnd } from '../../shared/admin-events';
import { i18n } from '../../shared/i18n';
import { notifications } from '../../shared/notifications';

// A drop shorter than this — a socket recycled, a laptop waking — is not worth a toast.
const LOSS_DELAY_MS = 1000;

/**
 * Tells the user the live updates stopped: a lost connection until it is back, an ended session for
 * good, with a reload as the way back. Started before the hub connects, since nothing is replayed.
 */
export function startConnectionNotices(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dismiss: (() => void) | undefined;
  let ended = false;

  const hide = (): void => {
    clearTimeout(timer);
    timer = undefined;
    dismiss?.();
    dismiss = undefined;
  };

  const stopConnection = subscribeConnection((connected) => {
    // The served client stops reconnecting once the session is gone; its notice stands.
    if (ended) {
      return;
    }

    hide();
    if (!connected) {
      timer = setTimeout(() => {
        dismiss = notifications.notify('error', i18n('connection.lost'), { autoHide: false });
      }, LOSS_DELAY_MS);
    }
  });

  const stopSessionEnd = subscribeSessionEnd(() => {
    ended = true;
    hide();
    dismiss = notifications.notify('error', i18n('connection.sessionEnded'), {
      autoHide: false,
      actions: [{ label: i18n('connection.reload'), onClick: () => window.location.reload() }],
    });
  });

  return () => {
    stopConnection();
    stopSessionEnd();
    hide();
  };
}
