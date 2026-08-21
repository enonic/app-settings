import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setConfig, type ToolConfig } from '../config';
import { $config } from '../config/config.store';
import { requestGraphQl, requestGraphQlDocument, requestGraphQlRoots } from './graphql';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    events: 'ws:/_/admin:event',
    extensions: '/_/admin:extension',
    graphql: '/_/app:graphql',
    serverApp: {
      start: '/_/server:app/start',
      stop: '/_/server:app/stop',
      uninstall: '/_/server:app/uninstall',
      install: '/_/server:app/install',
      installUrl: '/_/server:app/installUrl',
    },
  },
} satisfies ToolConfig;

const ROLES = { field: 'roles', selection: '{ key }' };
const PROJECTS = { field: 'projects', selection: '{ id }' };

function respondWith(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

type PendingRequest = {
  query: unknown;
  respondWith: (body: unknown) => void;
  fail: (error: unknown) => void;
};

/**
 * Hands every `fetch` call back unsettled, so a test can count what reached the network. Settle all of
 * them: the queue is module state, and one left pending stalls whichever test runs next.
 */
function captureRequests(): PendingRequest[] {
  const requests: PendingRequest[] = [];

  globalThis.fetch = vi.fn((_url: unknown, options?: { body?: string }) => {
    const { query } = JSON.parse(options?.body ?? '{}') as { query?: unknown };
    return new Promise<Response>((resolve, reject) => {
      requests.push({
        query,
        respondWith: (body) => resolve(new Response(JSON.stringify(body))),
        fail: reject,
      });
    });
  }) as unknown as typeof globalThis.fetch;

  return requests;
}

beforeEach(() => {
  setConfig(config);
});

afterEach(() => {
  $config.set(undefined);
  vi.restoreAllMocks();
});

describe('requestGraphQl', () => {
  it('builds one operation around the root it was given', async () => {
    const requests = captureRequests();

    const roles = requestGraphQl<{ roles: string[] }>(ROLES);

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.query).toBe('query Roles { roles { key } }');

    requests[0]?.respondWith({ data: { roles: ['a'] } });
    const result = await roles;
    expect(result.isOk() && result.value.roles).toEqual(['a']);
  });

  it('asks for a scalar root field without a selection', async () => {
    const requests = captureRequests();

    const version = requestGraphQl<{ systemVersion: string }>({ field: 'systemVersion' });

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.query).toBe('query SystemVersion { systemVersion }');

    requests[0]?.respondWith({ data: { systemVersion: '8.1.0' } });
    expect((await version).isOk()).toBe(true);
  });

  it('posts to the url from the tool config', async () => {
    respondWith({ data: { roles: [] } });

    await requestGraphQl(ROLES);

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [
      string,
      { method?: string; body?: string },
    ];
    expect(url).toBe('/_/app:graphql');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body ?? '')).toEqual({ query: 'query Roles { roles { key } }' });
  });

  it('treats an empty list as an answer, not as absence', async () => {
    respondWith({ data: { roles: [] } });

    const result = await requestGraphQl<{ roles: string[] }>(ROLES);

    expect(result.isOk() && result.value.roles).toEqual([]);
  });

  it('fails when its field came back null, reporting what the response said', async () => {
    respondWith({ data: { roles: null }, errors: [{ message: 'Principals are unreachable' }] });

    const result = await requestGraphQl(ROLES);

    expect(result.isErr() && result.error.message).toBe('Principals are unreachable');
  });

  // ! What a nullable root field newly permits: null with nothing to explain it. Letting this through as
  // ! success would hand a mapper a null and throw inside `ResultAsync.map`, where neverthrow does not
  // ! catch — the store's `match` would never run and its status would stay `loading` for good.
  it('fails when its field came back null and no error explains why', async () => {
    respondWith({ data: { roles: null } });

    const result = await requestGraphQl(ROLES);

    expect(result.isErr() && result.error.message).toBe(
      'GraphQL response carried no `roles` and no error explaining why',
    );
  });

  it('reports every error message when the response carries several', async () => {
    respondWith({ errors: [{ message: 'Field undefined' }, { message: 'Also broken' }] });

    const result = await requestGraphQl(ROLES);

    expect(result.isErr() && result.error.message).toBe('Field undefined; Also broken');
  });

  it('falls back to a generic message when an error carries none', async () => {
    respondWith({ errors: [{}] });

    const result = await requestGraphQl(ROLES);

    expect(result.isErr() && result.error.message).toBe('GraphQL request failed');
  });

  it('surfaces the server message on a non-200 status', async () => {
    respondWith({ message: 'Request body carries no `query` string' }, 400);

    const result = await requestGraphQl(ROLES);

    expect(result.isErr() && result.error.message).toBe('Request body carries no `query` string');
  });

  it('fails without reaching the network when the config was never set', async () => {
    $config.set(undefined);
    globalThis.fetch = vi.fn();

    const result = await requestGraphQl(ROLES);

    expect(result.isErr()).toBe(true);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });
});

describe('requestGraphQlRoots', () => {
  it('puts every root in one document under the name it was given', async () => {
    const requests = captureRequests();

    const screen = requestGraphQlRoots([ROLES, PROJECTS], 'RolesScreen');

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.query).toBe('query RolesScreen { roles { key } projects { id } }');

    requests[0]?.respondWith({ data: { roles: ['a'], projects: ['b'] } });
    expect((await screen).isOk()).toBe(true);
  });

  it('hands back the data as it arrived, with no message', async () => {
    respondWith({ data: { roles: ['a'], projects: ['b'] } });

    const result = await requestGraphQlRoots<{ roles: string[]; projects: string[] }>(
      [ROLES, PROJECTS],
      'RolesScreen',
    );

    expect(result.isOk() && result.value).toEqual({
      data: { roles: ['a'], projects: ['b'] },
      message: undefined,
    });
  });

  // ! It does not decide what a failure means. A field that failed is null in `data` and the caller —
  // ! which knows what it asked for — turns that into per-domain state.
  it('succeeds with a null field beside the ones that arrived', async () => {
    respondWith({
      data: { roles: ['a'], projects: null },
      errors: [{ message: 'Project repo is down' }],
    });

    const result = await requestGraphQlRoots<{ roles: string[]; projects: string[] | null }>(
      [ROLES, PROJECTS],
      'RolesScreen',
    );

    expect(result.isOk() && result.value.data.roles).toEqual(['a']);
    expect(result.isOk() && result.value.data.projects).toBeNull();
    expect(result.isOk() && result.value.message).toBe('Project repo is down');
  });

  it('carries every message when several fields failed', async () => {
    respondWith({
      data: { roles: null, projects: null },
      errors: [{ message: 'Principals are unreachable' }, { message: 'Project repo is down' }],
    });

    const result = await requestGraphQlRoots([ROLES, PROJECTS], 'RolesScreen');

    expect(result.isOk() && result.value.message).toBe(
      'Principals are unreachable; Project repo is down',
    );
  });

  it('fails as a whole when the answer carries no data at all', async () => {
    respondWith({ errors: [{ message: 'Query is invalid' }] });

    const result = await requestGraphQlRoots([ROLES, PROJECTS], 'RolesScreen');

    expect(result.isErr() && result.error.message).toBe('Query is invalid');
  });
});

describe('roots with arguments', () => {
  // ! Values travel as JSON variables, never as document text — nothing a user typed is ever parsed as
  // ! part of the query.
  it('declares each variable once and sends its value separately', async () => {
    respondWith({ data: { users: { total: 0, hits: [] } } });

    await requestGraphQlRoots(
      [
        {
          field: 'users',
          args: '(start: $start, search: $search)',
          variables: { start: 'Int', search: 'String' },
          selection: '{ total }',
        },
      ],
      'UsersScreen',
      { values: { start: 50, search: 'say "hi"' } },
    );

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(options.body ?? '')).toEqual({
      query:
        'query UsersScreen($start: Int, $search: String) { users(start: $start, search: $search) { total } }',
      variables: { start: 50, search: 'say "hi"' },
    });
  });

  // ! Two roots meaning different things by one name would produce a document the server rejects, and the
  // ! error would read as ours rather than as the mistake it is.
  it('refuses roots that disagree on a variable type', async () => {
    respondWith({ data: {} });

    globalThis.fetch = vi.fn();

    const result = await requestGraphQlRoots(
      [
        { field: 'a', args: '(x: $x)', variables: { x: 'Int' }, selection: '{ y }' },
        { field: 'b', args: '(x: $x)', variables: { x: 'String' }, selection: '{ y }' },
      ],
      'Clash',
    );

    expect(result.isErr() && result.error.message).toContain('disagree on the type of $x');
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('declares a variable two roots share exactly once', async () => {
    respondWith({ data: { a: { y: 1 }, b: { y: 2 } } });

    await requestGraphQlRoots(
      [
        { field: 'a', args: '(x: $x)', variables: { x: 'Int' }, selection: '{ y }' },
        { field: 'b', args: '(x: $x)', variables: { x: 'Int' }, selection: '{ y }' },
      ],
      'Shared',
      { values: { x: 1 } },
    );

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, { body?: string }];
    const { query } = JSON.parse(options.body ?? '') as { query: string };
    expect(query).toBe('query Shared($x: Int) { a(x: $x) { y } b(x: $x) { y } }');
  });

  // ! Co-locating a declaration with the arguments makes them easy to keep in step; comparing them makes
  // ! it impossible to get wrong. Both halves of a mismatch are GraphQL validation errors, and both would
  // ! surface as a failed screen rather than as the typo they are.
  it('refuses a root that uses a variable it did not declare', async () => {
    globalThis.fetch = vi.fn();

    const result = await requestGraphQl({
      field: 'users',
      args: '(start: $start)',
      variables: { count: 'Int' },
      selection: '{ total }',
    });

    expect(result.isErr()).toBe(true);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('refuses a root that declares a variable it does not use', async () => {
    globalThis.fetch = vi.fn();

    const result = await requestGraphQl({
      field: 'users',
      args: '(start: $start)',
      variables: { start: 'Int', count: 'Int' },
      selection: '{ total }',
    });

    expect(result.isErr()).toBe(true);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('writes no header and sends no variables when a screen declares none', async () => {
    respondWith({ data: { roles: [] } });

    await requestGraphQlRoots([ROLES], 'RolesScreen');

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(options.body ?? '')).toEqual({
      query: 'query RolesScreen { roles { key } }',
    });
  });

  it('carries arguments on a single root too', async () => {
    respondWith({ data: { users: { total: 0, hits: [] } } });

    await requestGraphQl(
      {
        field: 'users',
        args: '(count: $count)',
        variables: { count: 'Int' },
        selection: '{ total }',
      },
      { values: { count: 10 } },
    );

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(options.body ?? '')).toEqual({
      query: 'query Users($count: Int) { users(count: $count) { total } }',
      variables: { count: 10 },
    });
  });
});

describe('requestGraphQlDocument', () => {
  it('sends the document and its variables untouched', async () => {
    respondWith({ data: { x: 1 } });

    await requestGraphQlDocument('query X($k: String) { x(key: $k) }', { k: 'app' });

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(options.body ?? '')).toEqual({
      query: 'query X($k: String) { x(key: $k) }',
      variables: { k: 'app' },
    });
  });

  it('fails on any error, since it cannot know which field the caller needed', async () => {
    respondWith({ data: { x: 1 }, errors: [{ message: 'Resolver blew up' }] });

    const result = await requestGraphQlDocument('query X { x }');

    expect(result.isErr() && result.error.message).toBe('Resolver blew up');
  });

  // Why it is the right home for a field whose null is a legitimate answer, like `applicationInfo`.
  it('hands a null field through as success', async () => {
    respondWith({ data: { applicationInfo: null } });

    const result = await requestGraphQlDocument<{ applicationInfo: unknown }>(
      'query Info { applicationInfo(key: "nope") { key } }',
    );

    expect(result.isOk() && result.value.applicationInfo).toBeNull();
  });
});

describe('the request queue', () => {
  it('holds a request back until the one in flight has answered, in the order asked', async () => {
    const requests = captureRequests();

    const roles = requestGraphQl<{ roles: string[] }>(ROLES);
    const projects = requestGraphQl<{ projects: string[] }>(PROJECTS);

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.query).toBe('query Roles { roles { key } }');

    requests[0]?.respondWith({ data: { roles: ['a'] } });
    expect((await roles).isOk()).toBe(true);

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.query).toBe('query Projects { projects { id } }');

    requests[1]?.respondWith({ data: { projects: ['b'] } });
    expect((await projects).isOk()).toBe(true);
  });

  it('keeps moving when the request ahead fails', async () => {
    const requests = captureRequests();

    const roles = requestGraphQl(ROLES);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const projects = requestGraphQl<{ projects: string[] }>(PROJECTS);

    requests[0]?.fail(new TypeError('Network is down'));
    expect((await roles).isErr()).toBe(true);

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    requests[1]?.respondWith({ data: { projects: ['b'] } });
    expect((await projects).isOk()).toBe(true);
  });

  // ! A body no GraphQL server should produce. It has to fail as a value, because a throw escaping the
  // ! drain loop would leave the queue wedged and every later request in the page's life unanswered.
  it('fails as a value on a payload it cannot read, and stays alive', async () => {
    respondWith(null);

    expect((await requestGraphQl(ROLES)).isErr()).toBe(true);

    respondWith({ data: { projects: ['b'] } });
    const after = await requestGraphQl<{ projects: string[] }>(PROJECTS);
    expect(after.isOk() && after.value.projects).toEqual(['b']);
  });

  it('answers a cancelled request without sending it', async () => {
    const requests = captureRequests();

    const aborted = new AbortController();
    const dropped = requestGraphQl(ROLES, { signal: aborted.signal });
    const kept = requestGraphQl<{ projects: string[] }>(PROJECTS);
    aborted.abort();

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    // Only the surviving caller's document, so the cancelled one cost the server nothing.
    expect(requests[0]?.query).toBe('query Projects { projects { id } }');
    expect((await dropped).isErr()).toBe(true);

    requests[0]?.respondWith({ data: { projects: ['b'] } });
    expect((await kept).isOk()).toBe(true);
  });

  it('forwards the caller signal, so a request in flight can be cancelled', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    globalThis.fetch = vi.fn((_url: unknown, options?: { signal?: AbortSignal }) => {
      signals.push(options?.signal);
      return Promise.resolve(new Response(JSON.stringify({ data: { roles: [] } })));
    }) as unknown as typeof globalThis.fetch;

    const controller = new AbortController();
    await requestGraphQl(ROLES, { signal: controller.signal });

    expect(signals[0]).toBe(controller.signal);
  });
});
