import type { SectionExtension } from '../entities/extension';
import { $resolvedTheme } from '../shared/app-state';
import { $config } from '../shared/config';
import { dismissNotification, notify } from '../shared/notifications';
import type { Host, Notification } from '../shared/sections';
import { onServerEvent } from '../shared/server-events';
import { router } from './router';

/**
 * Everything a section cannot answer for itself, for one mount. Hardened in 1.5: revocation at
 * unmount, the unfiltered event stream, and a `path` that freezes while the section is hidden.
 */
export function createSectionHost(section: SectionExtension): Host {
  const prefix = `/${section.slug}`;

  const subPath = (): string => {
    const { pathname, searchStr } = router.state.location;
    return `${pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''}${searchStr}`;
  };

  const splat = (subPath: string): string => subPath.replace(/^\/+/, '').split('?')[0];

  return {
    baseUrl: section.url,
    locale: $config.get()?.locale ?? 'en',
    theme: $resolvedTheme,
    path: {
      get: subPath,
      subscribe: (cb) => router.subscribe('onResolved', () => cb(subPath())),
    },
    navigate: (to, opts) => {
      void router.navigate({
        to: '/$slug/$',
        params: { slug: section.slug, _splat: splat(to) },
        replace: opts?.replace,
      });
    },
    // Hash history, so an anchor's href carries the fragment the router reads.
    url: (to) => `#${prefix}/${splat(to)}`,
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
