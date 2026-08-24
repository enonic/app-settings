import { useSectionExtensions } from '../../entities/extension';
import { NotificationList } from '../../widgets/notifications/NotificationList';
import { SectionRail } from '../../widgets/section-rail/SectionRail';
import { useSectionRedirect } from '../model/useSectionRedirect';
import { AppBar } from './AppBar';
import { SectionMounts } from './SectionMounts';

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

        {/* Not an `Outlet`: the sections outlive the route that reveals them. */}
        <main className="flex min-h-0 flex-1 flex-col">
          <SectionMounts />
        </main>
      </div>

      <NotificationList />
    </div>
  );
}
