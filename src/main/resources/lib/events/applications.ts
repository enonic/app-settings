import { sendToTopic, setTopic } from '/lib/xp/admin';
import { listener } from '/lib/xp/event';

const APPLICATIONS = 'applications';
const APPLICATION_PROGRESS = 'application-progress';

export function initApplications(): void {
  // Both audiences mirror the Applications section; role:system.admin subscribes regardless.
  setTopic({ name: APPLICATIONS, allow: ['role:system.admin'] });
  setTopic({ name: APPLICATION_PROGRESS, allow: ['role:system.admin'] });

  listener({
    type: 'application',
    localOnly: false,
    callback: (event) => {
      if (event.data.eventType === 'PROGRESS') {
        publishProgress(event.data);
        return;
      }

      publishLifecycle(event.data);
    },
  });
}

//
// * Internal
//

/** An application's lifecycle, as `{eventType, key, systemApplication}`. */
function publishLifecycle(data: Record<string, unknown>): void {
  const { eventType, applicationKey, systemApplication } = data;

  if (typeof eventType !== 'string' || typeof applicationKey !== 'string') {
    return;
  }

  sendToTopic(APPLICATIONS, {
    eventType,
    key: applicationKey,
    systemApplication: systemApplication === true,
  });
}

/** Core's download progress, passed through as `{url, percent}`. */
function publishProgress(data: Record<string, unknown>): void {
  const { applicationUrl, progress } = data;

  if (typeof applicationUrl !== 'string' || applicationUrl === '') {
    return;
  }

  // Core computes the percent, but this is still a wire boundary: a NaN or an out-of-range value
  // would reach the browser as a width.
  if (
    typeof progress !== 'number' ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 100
  ) {
    return;
  }

  sendToTopic(APPLICATION_PROGRESS, { url: applicationUrl, percent: progress });
}
