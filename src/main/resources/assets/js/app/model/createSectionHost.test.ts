import type { ResolvedTheme } from '@enonic/ui-types';
import { atom } from 'nanostores';
import { afterEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => {
  const resolved = new Set<() => void>();
  return {
    history: { location: { pathname: '/users', search: '' }, push: vi.fn(), replace: vi.fn() },
    subscribe: vi.fn((_event: string, cb: () => void) => {
      resolved.add(cb);
      return () => resolved.delete(cb);
    }),
    /** The url moved: what TanStack's `onResolved` would fire. */
    resolve: () => resolved.forEach((cb) => cb()),
  };
});
vi.mock('./router', () => ({ router }));
vi.mock('../../entities/extension', () => ({ sectionExtensionByKey: () => undefined }));
vi.mock('../../shared/config', () => ({ $config: atom(undefined) }));
// The stored theme, standing in for `localStorage` and the OS, which a node run has neither of.
const theme = vi.hoisted(() => {
  let current: ResolvedTheme = 'light';
  const listeners = new Set<(theme: ResolvedTheme) => void>();
  return {
    read: () => current,
    subscribe: (listener: (theme: ResolvedTheme) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** The user switched: what `subscribeResolvedTheme` would report. */
    set: (next: ResolvedTheme) => {
      current = next;
      listeners.forEach((listener) => listener(next));
    },
  };
});
vi.mock('@enonic/ui-utils', () => ({
  readResolvedTheme: theme.read,
  subscribeResolvedTheme: theme.subscribe,
}));
const notify = vi.hoisted(() => vi.fn(() => 'id'));
vi.mock('../../shared/notifications', () => ({
  notify,
  dismissNotification: vi.fn(),
  dismissNotifications: vi.fn(),
}));

import type { SectionExtension } from '../../entities/extension';
import { createSectionHost } from './createSectionHost';

const section = { key: 'com.enonic.app.users:users', slug: 'users', url: '/x' } as SectionExtension;

afterEach(() => {
  theme.set('light');
  router.history.location.pathname = '/users';
  notify.mockClear();
});

describe('host.extension', () => {
  it('is the descriptor key of the section this mount is', () => {
    const { host } = createSectionHost(section);

    expect(host.extension).toBe('com.enonic.app.users:users');
  });
});

describe('host.notify', () => {
  it('raises the toast on the shell stack under this section, auto-hiding by default', () => {
    const { host } = createSectionHost(section);

    host.notify('error', 'It broke');

    expect(notify).toHaveBeenCalledWith({
      tone: 'error',
      text: 'It broke',
      autoHide: true,
      lifetimeMs: undefined,
      owner: 'com.enonic.app.users:users',
    });
  });

  it('passes on the lifetime and the choice to stay', () => {
    const { host } = createSectionHost(section);

    host.notify('warning', 'Still here', { autoHide: false, lifetimeMs: 9000 });

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ autoHide: false, lifetimeMs: 9000 }),
    );
  });

  it('does nothing once revoked', () => {
    const { host, revoke } = createSectionHost(section);
    revoke();

    const dismiss = host.notify('info', 'Too late');

    expect(notify).not.toHaveBeenCalled();
    expect(dismiss).toBeTypeOf('function');
  });
});

describe('host.theme', () => {
  // ! The contract: `subscribe` reports changes only. A provider reads `get()` first, and a
  // ! call-back on subscribe would re-render every section once for nothing.
  it('does not call back on subscribe', () => {
    const { host } = createSectionHost(section);
    const cb = vi.fn();

    host.theme.listen(cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it('reports a change', () => {
    const { host } = createSectionHost(section);
    const cb = vi.fn();
    host.theme.listen(cb);

    theme.set('dark');

    expect(cb).toHaveBeenCalledExactlyOnceWith('dark');
    expect(host.theme.get()).toBe('dark');
  });

  it('stops reporting once revoked', () => {
    const { host, revoke } = createSectionHost(section);
    const cb = vi.fn();
    host.theme.listen(cb);

    revoke();
    theme.set('dark');

    expect(cb).not.toHaveBeenCalled();
    expect(host.theme.listen(cb)).toBeTypeOf('function');
  });
});

describe('host.visible', () => {
  it('is whether the section is the one the url shows', () => {
    const { host } = createSectionHost(section);

    expect(host.visible.get()).toBe(true);

    router.history.location.pathname = '/roles';

    expect(host.visible.get()).toBe(false);
  });

  it('reports a switch away and back, without calling back on subscribe', () => {
    const { host } = createSectionHost(section);
    const cb = vi.fn();
    host.visible.listen(cb);

    expect(cb).not.toHaveBeenCalled();

    router.history.location.pathname = '/roles';
    router.resolve();
    router.history.location.pathname = '/users';
    router.resolve();

    expect(cb.mock.calls).toEqual([[false], [true]]);
  });

  it('stops reporting once revoked', () => {
    const { host, revoke } = createSectionHost(section);
    const cb = vi.fn();
    host.visible.listen(cb);

    revoke();
    router.history.location.pathname = '/roles';
    router.resolve();

    expect(cb).not.toHaveBeenCalled();
  });
});
