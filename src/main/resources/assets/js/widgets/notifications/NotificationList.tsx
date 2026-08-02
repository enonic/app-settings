import { Toast } from '@enonic/ui';
import { useStore } from '@nanostores/preact';

import {
  $notifications,
  dismissNotification,
  pauseNotification,
  resumeNotification,
} from '../../shared/notifications';

// Above the `z-40` @enonic/ui gives dialog content and menus: a notification reports on what the
// dialog just did.
const POSITION =
  'fixed right-0 bottom-0 z-50 w-full px-2 pb-2 ' +
  'sm:right-9 sm:bottom-6 sm:max-w-115 sm:p-0 ' +
  'md:right-11.5 md:bottom-7.5 lg:right-15 lg:bottom-10 2xl:right-23 2xl:bottom-15';

export function NotificationList() {
  const notifications = useStore($notifications);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={POSITION}>
      <div className="flex flex-col items-center gap-2.5">
        {notifications.map(({ id, tone, text, actions }) => (
          <div
            key={id}
            className="w-full"
            onMouseEnter={() => pauseNotification(id)}
            onMouseLeave={() => resumeNotification(id)}
          >
            <Toast withClose onOpenChange={(open) => !open && dismissNotification(id)}>
              <Toast.Icon tone={tone} />
              <Toast.Description>{text}</Toast.Description>
              {actions.map(({ label, onClick }) => (
                <Toast.Button key={label} label={label} onClick={onClick} />
              ))}
            </Toast>
          </div>
        ))}
      </div>
    </div>
  );
}
