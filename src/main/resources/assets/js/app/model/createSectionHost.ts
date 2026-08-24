import { sectionExtensionByKey, type SectionExtension } from '../../entities/extension';
import { $resolvedTheme } from '../../shared/app-state';
import { $config } from '../../shared/config';
import { dismissNotification, notify } from '../../shared/notifications';
import {
  createSectionPath,
  isInSection,
  readSubPath,
  sectionPath,
  type Host,
  type Notification,
} from '../../shared/sections';
import { onServerEvent } from '../../shared/server-events';
import { router } from './router';

/**
 * Everything a section cannot answer for itself, for one mount. Revocation at unmount is still to
 * come — `docs/extensions/progress.md`.
 */
export function createSectionHost(section: SectionExtension): Host {
  // A collision resolved differently after an install moves the slug, so it is read per call.
  const slug = (): string => sectionExtensionByKey(section.key)?.slug ?? section.slug;

  const subPath = (): string => {
    const { pathname, searchStr } = router.state.location;
    return readSubPath(pathname, searchStr, slug());
  };

  const isActive = (): boolean => isInSection(router.state.location.pathname, slug());

  return {
    baseUrl: section.url,
    locale: $config.get()?.locale ?? 'en',
    theme: $resolvedTheme,
    path: createSectionPath({
      read: subPath,
      isActive,
      onUrlChange: (cb) => router.subscribe('onResolved', () => cb()),
    }),
    // ! Through history, not `router.navigate`: the router would re-serialize the search params, and
    // ! they are the guest's own string.
    navigate: (to, opts) => {
      // ! Hidden, so this came from a subscription rather than user intent: navigating would move
      // ! the url under the section actually showing.
      if (!isActive()) {
        console.warn(`Section ${section.key} tried to navigate while hidden; ignored.`);
        return;
      }

      const path = sectionPath(slug(), to);

      if (opts?.replace === true) {
        router.history.replace(path);
      } else {
        router.history.push(path);
      }
    },
    // Hash history, so an anchor's href carries the fragment the router reads.
    url: (to) => `#${sectionPath(slug(), to)}`,
    subscribeEvents: (cb) => onServerEvent(cb),
    notify: (n) => {
      const id = notify(toNotificationOptions(n));
      return () => dismissNotification(id);
    },
  };
}

//
// * Internal
//

function toNotificationOptions(n: Notification) {
  return {
    tone: n.level,
    text: n.message,
    autoHide: n.autoClose !== false,
    lifetimeMs: typeof n.autoClose === 'number' ? n.autoClose : undefined,
    actions:
      n.action == null ? [] : [{ label: n.action.label, onClick: () => n.action?.onAction() }],
  };
}
