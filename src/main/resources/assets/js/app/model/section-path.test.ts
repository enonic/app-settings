import { describe, expect, it } from 'vitest';

import { createSectionPath, isInSection, readSubPath, sectionPath } from './section-path';

describe('readSubPath', () => {
  it('is what follows the section slug', () => {
    expect(readSubPath('/users/u1/edit', '', 'users')).toBe('/u1/edit');
  });

  it('is empty at the section root', () => {
    expect(readSubPath('/users', '', 'users')).toBe('');
  });

  it('carries the search string, repeated keys and all', () => {
    expect(readSubPath('/users/u1', '?q=b&q=a', 'users')).toBe('/u1?q=b&q=a');
  });

  it('carries a search string at the section root', () => {
    expect(readSubPath('/users', '?q=a', 'users')).toBe('?q=a');
  });

  it('is empty while another section is the one showing', () => {
    expect(readSubPath('/roles/r1', '', 'users')).toBe('');
  });

  it("does not hand over another section's search string", () => {
    expect(readSubPath('/roles/r1', '?q=a', 'users')).toBe('');
  });

  it('does not answer for a slug its own merely begins', () => {
    expect(readSubPath('/users-admin/x', '', 'users')).toBe('');
  });
});

describe('sectionPath', () => {
  it('puts the sub-path under the section', () => {
    expect(sectionPath('users', '/u1/edit')).toBe('/users/u1/edit');
  });

  it('is the section root for an empty sub-path', () => {
    expect(sectionPath('users', '')).toBe('/users');
  });

  it('takes a sub-path written without its leading slash', () => {
    expect(sectionPath('users', 'u1')).toBe('/users/u1');
  });

  it('leaves the search string exactly as the guest wrote it', () => {
    expect(sectionPath('users', '/u1?q=b&q=a&filter=state:started')).toBe(
      '/users/u1?q=b&q=a&filter=state:started',
    );
  });

  it('keeps a search string with nothing in front of it', () => {
    expect(sectionPath('users', '?q=a')).toBe('/users?q=a');
  });

  it('keeps a second question mark inside the search string', () => {
    expect(sectionPath('users', '/u1?q=a?b')).toBe('/users/u1?q=a?b');
  });

  it('escapes a hash that would otherwise end the url', () => {
    expect(sectionPath('users', '/u1?q=a#top')).toBe('/users/u1?q=a%23top');
  });

  it('escapes a percent so the escape stays reversible', () => {
    expect(sectionPath('users', '/u1?name=a%20b')).toBe('/users/u1?name=a%2520b');
  });

  it('drops a trailing slash', () => {
    expect(sectionPath('users', '/u1/')).toBe('/users/u1');
  });
});

describe('sectionPath → readSubPath round trip', () => {
  it.each([
    '/u1/edit',
    '/u1?q=b&q=a',
    '?flag',
    '?q=a%20b',
    '?filter=state:started',
    '?ids=1,2',
    '/note#1',
    '/raw%23literal',
    '/percent%25',
  ])('hands back %s exactly as the guest wrote it', (subPath) => {
    const url = sectionPath('users', subPath);
    const [pathname = '', ...rest] = url.split('?');
    const search = rest.length === 0 ? '' : `?${rest.join('?')}`;

    const expected = subPath.startsWith('?') ? subPath : subPath.replace(/\/+$/, '');
    expect(readSubPath(pathname, search, 'users')).toBe(expected);
  });
});

describe('isInSection', () => {
  it('accepts the section root and anything below it', () => {
    expect(isInSection('/users', 'users')).toBe(true);
    expect(isInSection('/users/u1/edit', 'users')).toBe(true);
  });

  it('rejects another section, and a slug its own merely begins', () => {
    expect(isInSection('/roles', 'users')).toBe(false);
    expect(isInSection('/users-admin/x', 'users')).toBe(false);
    expect(isInSection('/', 'users')).toBe(false);
  });
});

describe('createSectionPath', () => {
  function harness(initial: string, active = true) {
    let url = initial;
    let showing = active;
    const listeners = new Set<() => void>();

    const path = createSectionPath({
      read: () => url,
      isActive: () => showing,
      onUrlChange: (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
    });

    return {
      path,
      listenerCount: () => listeners.size,
      go: (next: string, stillShowing = showing): void => {
        url = next;
        showing = stillShowing;
        listeners.forEach((listener) => listener());
      },
      // The url has moved but the router has not told anyone yet.
      drift: (next: string): void => {
        url = next;
      },
    };
  }

  it('reads the sub-path while the section is showing', () => {
    const { path, go } = harness('/u1');

    expect(path.get()).toBe('/u1');

    go('/u1/edit');
    expect(path.get()).toBe('/u1/edit');
  });

  it('freezes at the last value it saw while showing', () => {
    const { path, go } = harness('/u1');
    path.get();

    go('/r1', false);

    expect(path.get()).toBe('/u1');
  });

  it('starts empty when the section is created hidden', () => {
    const { path } = harness('/u1', false);

    expect(path.get()).toBe('');
  });

  it('says nothing while the section is hidden', () => {
    const seen: string[] = [];
    const { path, go } = harness('/u1');
    path.subscribe((value) => seen.push(value));

    go('/r1', false);
    go('/r1/edit', false);

    expect(seen).toEqual([]);
  });

  it('speaks up again when the section is shown with a different sub-path', () => {
    const seen: string[] = [];
    const { path, go } = harness('/u1');
    path.subscribe((value) => seen.push(value));

    go('/r1', false);
    go('/u2', true);

    expect(seen).toEqual(['/u2']);
  });

  it('stays quiet when the section comes back to where it was left', () => {
    const seen: string[] = [];
    const { path, go } = harness('/u1');
    path.subscribe((value) => seen.push(value));

    go('/r1', false);
    go('/u1', true);

    expect(seen).toEqual([]);
  });

  it('emits only what changed while the section is showing', () => {
    const seen: string[] = [];
    const { path, go } = harness('/u1');
    path.subscribe((value) => seen.push(value));

    go('/u2');
    go('/u2');
    go('/u3');

    expect(seen).toEqual(['/u2', '/u3']);
  });

  it('still tells listeners about a change a get() already saw', () => {
    const seen: string[] = [];
    const { path, go, drift } = harness('/u1');
    path.subscribe((value) => seen.push(value));

    // The url moves, a render reads it before the router notifies, then the notification lands.
    drift('/u2');
    expect(path.get()).toBe('/u2');
    go('/u2');

    expect(seen).toEqual(['/u2']);
  });

  it('lets go of the url once its last listener has', () => {
    const { path, listenerCount } = harness('/u1');
    const first = path.subscribe(() => {});
    const second = path.subscribe(() => {});

    expect(listenerCount()).toBe(1);

    first();
    expect(listenerCount()).toBe(1);

    second();
    expect(listenerCount()).toBe(0);
  });
});
