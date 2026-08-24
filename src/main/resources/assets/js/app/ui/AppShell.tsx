import { useSectionExtensions } from '../../entities/extension';
import { NotificationList } from '../../widgets/notifications/NotificationList';
import { SectionRail, type SectionRailItem } from '../../widgets/section-rail/SectionRail';
import { sectionPath } from '../model/section-path';
import { lastSubPath, rememberSubPath } from '../model/section-paths';
import { useActiveSection } from '../model/useActiveSection';
import { useSectionRedirect } from '../model/useSectionRedirect';
import { AppBar } from './AppBar';
import { SectionMounts } from './SectionMounts';

export function AppShell() {
  useSectionRedirect();

  // TODO: [extensions] A failed discovery leaves the rail empty and says nothing; the shell's own
  // states are 5.2.
  const { items } = useSectionExtensions();
  const { section: active, subPath } = useActiveSection();

  // Recorded during render, like the visited set: the rail is built from it in this same pass.
  if (active != null) {
    rememberSubPath(active.slug, subPath);
  }

  // Clicking the section you are in resets it; coming back to one restores where you left it.
  const sections: SectionRailItem[] = items.map((section) => ({
    key: section.key,
    title: section.title,
    iconUrl: section.iconUrl,
    active: section.key === active?.key,
    href: `#${sectionPath(section.slug, section.key === active?.key ? '' : lastSubPath(section.slug))}`,
  }));

  return (
    <div className="bg-surface-primary text-main flex h-full overflow-hidden">
      <SectionRail sections={sections} />

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
