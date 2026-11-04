import { NotificationList } from '@enonic/ui-kit';

import { useSectionExtensions, type SectionExtensionsState } from '../../entities/extension';
import { isSystemAdmin } from '../../shared/config';
import { notifications } from '../../shared/notifications';
import { SectionRail, type SectionRailItem } from '../../widgets/section-rail/SectionRail';
import { SectionsEmpty } from '../../widgets/sections-empty/SectionsEmpty';
import { sectionPath } from '../model/section-path';
import { lastSubPath, rememberSubPath } from '../model/section-paths';
import { useActiveSection } from '../model/useActiveSection';
import { useSectionRedirect } from '../model/useSectionRedirect';
import { AppBar } from './AppBar';
import { SectionMounts } from './SectionMounts';

const APP_SHELL_NAME = 'AppShell';

// The selector, combobox and tooltip are `z-50` and portal to the body, so they win at an equal
// z-index. Hence 60 rather than the 50 that would clear dialogs and menus.
const NOTIFICATIONS_POSITION =
  'pointer-events-none fixed right-0 bottom-0 z-60 w-full px-2 pb-2 ' +
  'sm:right-9 sm:bottom-6 sm:max-w-115 sm:p-0 ' +
  'md:right-11.5 md:bottom-7.5 lg:right-15 lg:bottom-10 2xl:right-23 2xl:bottom-15';

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
    <div
      data-component={APP_SHELL_NAME}
      className="bg-surface-primary text-main flex h-full overflow-hidden"
    >
      <SectionRail sections={sections} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar />

        {/* Not an `Outlet`: the sections outlive the route that reveals them. */}
        <main className="flex min-h-0 flex-1 flex-col">
          {empty ? <SectionsEmpty reason={empty} hint={!isSystemAdmin()} /> : <SectionMounts />}
        </main>
      </div>

      <NotificationList notifications={notifications} className={NOTIFICATIONS_POSITION} />
    </div>
  );
}

AppShell.displayName = APP_SHELL_NAME;

//
// * Internal
//

function emptyReason({ status, items }: SectionExtensionsState): 'none' | 'failed' | undefined {
  if (status === 'error') {
    return 'failed';
  }

  return status === 'ready' && items.length === 0 ? 'none' : undefined;
}
