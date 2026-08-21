import { Outlet } from '@tanstack/react-router';

import { useSectionExtensions } from '../entities/extension';
import { NotificationList } from '../widgets/notifications/NotificationList';
import { SectionRail } from '../widgets/section-rail/SectionRail';
import { AppBar } from './AppBar';
import { useSectionRedirect } from './useSectionRedirect';

export function AppShell() {
  useSectionRedirect();

  // TODO: [extensions] A failed discovery leaves the rail empty and says nothing; the shell's own
  // states are 5.2.
  const { items } = useSectionExtensions();

  return (
    <div className="bg-surface-primary text-main flex h-full overflow-hidden">
      <SectionRail sections={items} />

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
