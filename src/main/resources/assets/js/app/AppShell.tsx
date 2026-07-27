import { Outlet } from '@tanstack/react-router';

import { SectionRail } from '../widgets/section-rail/SectionRail';
import { AppBar } from './AppBar';

export function AppShell() {
  return (
    <div className="bg-surface-primary text-main flex h-full overflow-hidden">
      <SectionRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar />

        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
