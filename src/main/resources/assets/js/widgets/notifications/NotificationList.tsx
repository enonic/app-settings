import { Toast } from '@enonic/ui';
import { useStore } from '@nanostores/preact';

import { useI18n } from '../../shared/i18n';
import {
  $notifications,
  dismissNotification,
  isUrgent,
  pauseNotification,
  resumeNotification,
} from '../../shared/notifications';

// The selector, combobox and tooltip are `z-50` and portal to the body, so they win at an equal
// z-index. Hence 60 rather than the 50 that would clear dialogs and menus.
const POSITION =
  'pointer-events-none fixed right-0 bottom-0 z-60 w-full px-2 pb-2 ' +
  'sm:right-9 sm:bottom-6 sm:max-w-115 sm:p-0 ' +
  'md:right-11.5 md:bottom-7.5 lg:right-15 lg:bottom-10 2xl:right-23 2xl:bottom-15';

export function NotificationList() {
  const i18n = useI18n();
  const notifications = useStore($notifications);

  return (
    <div className={POSITION} role="region" aria-label={i18n('notifications.label')}>
      {/* ? Announced reliably only if the region predates its content, so these stay mounted and
          the toasts are silenced with `aria-live="off"`. */}
      <div className="sr-only" aria-live="polite">
        {notifications
          .filter(({ tone }) => !isUrgent(tone))
          .map(({ id, text }) => (
            <p key={id}>{text}</p>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive">
        {notifications
          .filter(({ tone }) => isUrgent(tone))
          .map(({ id, text }) => (
            <p key={id}>{text}</p>
          ))}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        {/* ? Focus pauses as hover does, or an action is pulled out from under a keyboard user
            halfway to it. */}
        {notifications.map(({ id, tone, text, actions }) => (
          <div
            key={id}
            className="pointer-events-auto w-full"
            onMouseEnter={() => pauseNotification(id)}
            onMouseLeave={({ currentTarget }) =>
              !currentTarget.contains(document.activeElement) && resumeNotification(id)
            }
            onFocusCapture={() => pauseNotification(id)}
            onBlurCapture={({ currentTarget }) =>
              !currentTarget.matches(':hover') && resumeNotification(id)
            }
          >
            <Toast
              open
              withClose
              role="status"
              aria-live="off"
              onOpenChange={(open) => !open && dismissNotification(id)}
            >
              <Toast.Icon tone={tone} />
              <Toast.Description>{text}</Toast.Description>
              {actions.map(({ label, onClick }, index) => (
                <Toast.Button key={`${index}-${label}`} label={label} onClick={onClick} />
              ))}
            </Toast>
          </div>
        ))}
      </div>
    </div>
  );
}
