import { Outlet } from '@tanstack/react-router';

import { NotificationList } from '../widgets/notifications/NotificationList';
import { SectionRail } from '../widgets/section-rail/SectionRail';
import { AppBar } from './AppBar';

// TODO: [extensions] The rail is filled from discovery instead (1.2); the sections move to
// app-applications and app-users.
// import { SECTIONS } from './navigation';

export function AppShell() {
  return (
    <div className="bg-surface-primary text-main flex h-full overflow-hidden">
      <SectionRail sections={[]} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar />

        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      <NotificationList />
    </div>
  );
}
