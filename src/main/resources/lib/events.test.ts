import { readFileSync } from 'node:fs';

import { sendToTopic, setTopic } from '/lib/xp/admin';
import { listener } from '/lib/xp/event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HUB_TOPICS } from '../assets/js/shared/sections';
import { init, principalChanges } from './events';

type EventCallback = (event: { type: string; data: Record<string, unknown> }) => void;

function applicationCallback(): EventCallback {
  const call = vi.mocked(listener).mock.calls.find(([params]) => params.type === 'application');
  if (call == null) {
    throw new Error('No application listener registered');
  }
  return call[0].callback as EventCallback;
}

/** What core reports a download by: `ApplicationLoader.progress()` has no key to give. */
const DOWNLOAD_URL = 'https://repo/app-1.0.0.jar';

function progressEvent(progress: number): Record<string, unknown> {
  return { eventType: 'PROGRESS', applicationUrl: DOWNLOAD_URL, progress };
}

/** Renaming the app must fail here, not silently split the publisher from its subscribers. */
function builtAppName(): string {
  const properties = readFileSync('gradle.properties', 'utf8');
  const match = /^appName\s*=\s*(.+)$/m.exec(properties);
  if (match == null) {
    throw new Error('gradle.properties carries no appName');
  }
  return match[1].trim();
}

describe('init', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers exactly the canonical topics the contract publishes', () => {
    init();

    const appName = builtAppName();
    const canonical = vi
      .mocked(setTopic)
      .mock.calls.map(([{ name }]) => `${appName}:${name}`)
      .sort();
    expect(canonical).toEqual(Object.values(HUB_TOPICS).sort());
  });

  it('publishes only a validated application payload', () => {
    init();
    const callback = applicationCallback();

    callback({ type: 'application', data: { eventType: 'STARTED' } }); // no key
    callback({ type: 'application', data: { applicationKey: 'a' } }); // no type
    expect(sendToTopic).not.toHaveBeenCalled();

    callback({ type: 'application', data: { eventType: 'STOPPED', applicationKey: 'a' } });
    expect(sendToTopic).toHaveBeenCalledWith('applications', {
      eventType: 'STOPPED',
      key: 'a',
      systemApplication: false,
    });
  });

  it('publishes a download percent on the progress topic, never on applications', () => {
    init();

    applicationCallback()({
      type: 'application',
      data: progressEvent(42),
    });

    expect(sendToTopic).toHaveBeenCalledExactlyOnceWith('application-progress', {
      url: DOWNLOAD_URL,
      percent: 42,
    });
  });

  it('publishes the ends of the range, which carry no less than the middle', () => {
    init();
    const callback = applicationCallback();

    callback({ type: 'application', data: progressEvent(0) });
    callback({ type: 'application', data: progressEvent(100) });

    expect(sendToTopic).toHaveBeenNthCalledWith(1, 'application-progress', {
      url: DOWNLOAD_URL,
      percent: 0,
    });
    expect(sendToTopic).toHaveBeenNthCalledWith(2, 'application-progress', {
      url: DOWNLOAD_URL,
      percent: 100,
    });
  });

  it('publishes no progress it cannot key or size', () => {
    init();
    const callback = applicationCallback();

    callback({ type: 'application', data: { eventType: 'PROGRESS', progress: 42 } }); // no url
    callback({ type: 'application', data: { ...progressEvent(42), applicationUrl: '' } });
    callback({
      type: 'application',
      data: { eventType: 'PROGRESS', applicationUrl: DOWNLOAD_URL },
    }); // no percent
    callback({ type: 'application', data: { ...progressEvent(42), progress: '42' } });
    callback({ type: 'application', data: { ...progressEvent(42), progress: Number.NaN } });
    callback({ type: 'application', data: progressEvent(-1) });
    callback({ type: 'application', data: progressEvent(101) });

    expect(sendToTopic).not.toHaveBeenCalled();
  });

  it('keeps lifecycle events off the progress topic', () => {
    init();

    applicationCallback()({
      type: 'application',
      // A lifecycle event carrying a stray url is still not progress.
      data: {
        eventType: 'INSTALLED',
        applicationKey: 'a',
        applicationUrl: DOWNLOAD_URL,
        progress: 42,
      },
    });

    expect(sendToTopic).toHaveBeenCalledExactlyOnceWith('applications', {
      eventType: 'INSTALLED',
      key: 'a',
      systemApplication: false,
    });
  });
});

function nodeEvent(nodes: unknown): Record<string, unknown> {
  return { nodes };
}

function node(path: string, repo = 'system-repo'): { path: string; repo: string; id: string } {
  return { id: 'x', path, repo };
}

describe('principalChanges', () => {
  it('maps a user node to its principal key', () => {
    expect(principalChanges(nodeEvent([node('/identity/system/users/su')]))).toEqual([
      { kind: 'user', key: 'user:system:su' },
    ]);
  });

  it('maps a group node to its principal key', () => {
    expect(principalChanges(nodeEvent([node('/identity/corp/groups/devs')]))).toEqual([
      { kind: 'group', key: 'group:corp:devs' },
    ]);
  });

  it('maps a role node, which lives outside any provider', () => {
    expect(principalChanges(nodeEvent([node('/identity/roles/cms.admin')]))).toEqual([
      { kind: 'role', key: 'role:cms.admin' },
    ]);
  });

  it('maps the provider node itself', () => {
    expect(principalChanges(nodeEvent([node('/identity/corp')]))).toEqual([
      { kind: 'idProvider', key: 'corp' },
    ]);
  });

  it('ignores the structural folders between provider and principal', () => {
    expect(principalChanges(nodeEvent([node('/identity'), node('/identity/corp/users')]))).toEqual(
      [],
    );
  });

  it('ignores nodes of other repos, whatever their path', () => {
    expect(
      principalChanges(nodeEvent([node('/identity/system/users/su', 'com.enonic.cms.default')])),
    ).toEqual([]);
  });

  it('ignores paths below a principal and unknown folders', () => {
    expect(
      principalChanges(
        nodeEvent([node('/identity/system/users/su/profile'), node('/identity/corp/keys/k1')]),
      ),
    ).toEqual([]);
  });

  it('deduplicates and keeps every distinct change of a batch', () => {
    expect(
      principalChanges(
        nodeEvent([
          node('/identity/system/users/su'),
          node('/identity/system/users/su'),
          node('/identity/roles/cms.admin'),
        ]),
      ),
    ).toEqual([
      { kind: 'user', key: 'user:system:su' },
      { kind: 'role', key: 'role:cms.admin' },
    ]);
  });

  it('reads the flat single-node shape of node.permissionsUpdated', () => {
    expect(
      principalChanges({ id: 'n1', path: '/identity/corp', branch: 'master', repo: 'system-repo' }),
    ).toEqual([{ kind: 'idProvider', key: 'corp' }]);
  });

  it('carries both keys of a move — the previous and the current', () => {
    expect(
      principalChanges(
        nodeEvent([
          {
            id: 'n1',
            path: '/identity/corp',
            newPath: '/identity/enterprise',
            repo: 'system-repo',
          },
        ]),
      ),
    ).toEqual([
      { kind: 'idProvider', key: 'corp' },
      { kind: 'idProvider', key: 'enterprise' },
    ]);
  });

  it('answers empty for an event with no usable nodes', () => {
    expect(principalChanges({})).toEqual([]);
    expect(principalChanges(nodeEvent('not-a-list'))).toEqual([]);
    expect(principalChanges(nodeEvent([null, { repo: 'system-repo' }]))).toEqual([]);
  });
});
