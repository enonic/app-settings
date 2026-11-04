import { createNotifications } from '@enonic/ui-utils';

/** The shell's one toast stack: `AppShell` renders it, every section host raises on it. */
export const notifications = createNotifications();
