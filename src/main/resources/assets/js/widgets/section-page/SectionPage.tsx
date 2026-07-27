import { Outlet } from '@tanstack/react-router';

export function SectionPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <Outlet />
    </div>
  );
}
