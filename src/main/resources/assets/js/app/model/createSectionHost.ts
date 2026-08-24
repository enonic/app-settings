import { sectionExtensionByKey, type SectionExtension } from '../../entities/extension';
import { $resolvedTheme } from '../../shared/app-state';
import { $config } from '../../shared/config';
import { dismissNotification, dismissNotifications, notify } from '../../shared/notifications';
import type { Host, Notification } from '../../shared/sections';
import { onServerEvent } from '../../shared/server-events';
import { router } from './router';
import { createSectionPath, isInSection, readSubPath, sectionPath } from './section-path';

export type SectionHost = {
  host: Host;
  /** Run at unmount: the mount is gone, and nothing it kept a reference to may still act. */
  revoke: () => void;
};

/** Everything a section cannot answer for itself, for one mount. */
export function createSectionHost(section: SectionExtension): SectionHost {
  let revoked = false;
  const eventSubscriptions = new Set<() => void>();
  // A collision resolved differently after an install moves the slug, so it is read per call.
  const slug = (): string => sectionExtensionByKey(section.key)?.slug ?? section.slug;

  const subPath = (): string => {
    const { pathname, searchStr } = router.state.location;
    return readSubPath(pathname, searchStr, slug());
  };

  const isActive = (): boolean => isInSection(router.state.location.pathname, slug());

  const path = createSectionPath({
    read: subPath,
    isActive,
    onUrlChange: (cb) => router.subscribe('onResolved', () => cb()),
  });

  const host: Host = {
    baseUrl: section.url,
    locale: $config.get()?.locale ?? 'en',
    theme: $resolvedTheme,
    path,
    // ! Through history, not `router.navigate`: the router would re-serialize the search params, and
    // ! they are the guest's own string.
    navigate: (to, opts) => {
      if (revoked) {
        return;
      }

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
    subscribeEvents: (cb) => {
      if (revoked) {
        return () => {};
      }

      const unsubscribe = onServerEvent(cb);
      eventSubscriptions.add(unsubscribe);

      return () => {
        eventSubscriptions.delete(unsubscribe);
        unsubscribe();
      };
    },
    notify: (n) => {
      if (revoked) {
        return () => {};
      }

      const id = notify({ ...toNotificationOptions(n), owner: section.key });

      return () => dismissNotification(id);
    },
  };

  return {
    host,
    revoke: () => {
      revoked = true;
      eventSubscriptions.forEach((unsubscribe) => unsubscribe());
      eventSubscriptions.clear();
      path.dispose();
      dismissNotifications(section.key);
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
