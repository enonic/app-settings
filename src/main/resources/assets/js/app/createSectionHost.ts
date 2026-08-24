import type { SectionExtension } from '../entities/extension';
import { $resolvedTheme } from '../shared/app-state';
import { $config } from '../shared/config';
import { dismissNotification, notify } from '../shared/notifications';
import { readSubPath, sectionPath, type Host, type Notification } from '../shared/sections';
import { onServerEvent } from '../shared/server-events';
import { router } from './router';

/**
 * Everything a section cannot answer for itself, for one mount. Revocation at unmount and a `path`
 * that freezes while the section is hidden are still to come — `docs/extensions/progress.md`.
 */
export function createSectionHost(section: SectionExtension): Host {
  const subPath = (): string => {
    const { pathname, searchStr } = router.state.location;
    return readSubPath(pathname, searchStr, section.slug);
  };

  return {
    baseUrl: section.url,
    locale: $config.get()?.locale ?? 'en',
    theme: $resolvedTheme,
    path: {
      get: subPath,
      subscribe: (cb) => router.subscribe('onResolved', () => cb(subPath())),
    },
    // ! Through history, not `router.navigate`: the router would re-serialize the search params, and
    // ! they are the guest's own string.
    navigate: (to, opts) => {
      const path = sectionPath(section.slug, to);

      if (opts?.replace === true) {
        router.history.replace(path);
      } else {
        router.history.push(path);
      }
    },
    // Hash history, so an anchor's href carries the fragment the router reads.
    url: (to) => `#${sectionPath(section.slug, to)}`,
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
