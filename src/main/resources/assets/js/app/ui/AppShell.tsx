import { useSectionExtensions, type SectionExtensionsState } from '../../entities/extension';
import { isSystemAdmin } from '../../shared/config';
import { NotificationList } from '../../widgets/notifications/NotificationList';
import { SectionRail, type SectionRailItem } from '../../widgets/section-rail/SectionRail';
import { SectionsEmpty } from '../../widgets/sections-empty/SectionsEmpty';
import { sectionPath } from '../model/section-path';
import { lastSubPath, rememberSubPath } from '../model/section-paths';
import { useActiveSection } from '../model/useActiveSection';
import { useSectionRedirect } from '../model/useSectionRedirect';
import { AppBar } from './AppBar';
import { SectionMounts } from './SectionMounts';

export function AppShell() {
  useSectionRedirect();

  const discovery = useSectionExtensions();
  const { items } = discovery;
  const { section: active, subPath } = useActiveSection();

  const empty = emptyReason(discovery);

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
          {empty ? <SectionsEmpty reason={empty} hint={!isSystemAdmin()} /> : <SectionMounts />}
        </main>
      </div>

      <NotificationList />
    </div>
  );
}

//
// * Internal
//

function emptyReason({ status, items }: SectionExtensionsState): 'none' | 'failed' | undefined {
  if (status === 'error') {
    return 'failed';
  }

  return status === 'ready' && items.length === 0 ? 'none' : undefined;
}
