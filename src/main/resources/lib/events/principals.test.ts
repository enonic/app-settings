import { describe, expect, it } from 'vitest';

import { principalChanges } from './principals';

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
