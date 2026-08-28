import { sendToTopic, setTopic } from '/lib/xp/admin';
import { listener } from '/lib/xp/event';

// ! The hub owns every topic: it alone listens to XP events, gates each topic with its own
// ! `allow`, and publishes. A provider's section is only a subscriber, through the platform's
// ! `client.js` — the canonical names below are part of the contract (docs/extensions/docs.md).
const APPLICATIONS = 'applications';
const PRINCIPALS = 'principals';

/** What subscribers address; the hub composes the same name from the owning application. */
export function applicationsTopic(): string {
  return `${app.name}:${APPLICATIONS}`;
}

export function init(): void {
  // Each topic's audience mirrors the section it serves; role:system.admin subscribes regardless.
  setTopic({ name: APPLICATIONS, allow: ['role:system.admin'] });
  setTopic({ name: PRINCIPALS, allow: ['role:system.user.admin', 'role:system.user.app'] });

  listener({
    type: 'application',
    localOnly: false,
    callback: (event) => {
      const { eventType, applicationKey, systemApplication } = event.data;
      if (typeof eventType !== 'string') {
        return;
      }

      // Install progress stays off the hub: `server:app`'s SSE channel carries it, and a publish
      // per percent to every subscriber is noise.
      if (eventType !== 'PROGRESS') {
        sendToTopic(APPLICATIONS, { eventType, key: applicationKey, systemApplication });
      }
    },
  });

  listener({
    type: 'node.*',
    localOnly: false,
    callback: (event) => {
      // ! Before touching the payload: `pushed`/`sorted`/`duplicated` are the bulk batches a
      // ! content publish produces, principals never travel in them, and converting their node
      // ! arrays into this app's single script thread is the one real cost of listening wide.
      if (!PRINCIPAL_NODE_EVENTS.includes(event.type)) {
        return;
      }

      const changes = principalChanges(event.data);
      if (changes.length > 0) {
        sendToTopic(PRINCIPALS, { operation: operationOf(event.type), changes });
      }
    },
  });
}

//
// * Principals
//

/** `node.updated` → `updated`; anything unprefixed travels as it came. */
function operationOf(type: string): string {
  return type.startsWith('node.') ? type.slice('node.'.length) : type;
}

export type PrincipalKind = 'user' | 'group' | 'role' | 'idProvider';

/** Ids only, never data: a subscriber re-reads through its own gateway, where `allow` applies. */
export type PrincipalChange = { kind: PrincipalKind; key: string };

/** The node events a principal write can produce. */
const PRINCIPAL_NODE_EVENTS = [
  'node.created',
  'node.updated',
  'node.deleted',
  'node.moved',
  'node.permissionsUpdated',
];

/** Where XP keeps principals: nodes of the system repo under `/identity`. */
const SYSTEM_REPO = 'system-repo';

type EventNode = { path?: unknown; newPath?: unknown; repo?: unknown };

/**
 * The principal changes a `node.*` event carries, deduplicated. The paths mirror
 * `PrincipalKey.toPath()`: `/identity/roles/<id>`, `/identity/<provider>`,
 * `/identity/<provider>/users|groups/<id>` — anything else under the repo is not a principal.
 */
export function principalChanges(data: Record<string, unknown>): PrincipalChange[] {
  const { nodes } = data;
  // `node.permissionsUpdated` is the one node event with no `nodes` array — its node IS the data.
  const candidates: readonly EventNode[] = Array.isArray(nodes) ? nodes : [data];

  const changes = new Map<string, PrincipalChange>();

  candidates.forEach((node) => {
    if (node == null || typeof node !== 'object' || node.repo !== SYSTEM_REPO) {
      return;
    }

    // ! `node.moved` keeps the previous path in `path` and the current one in `newPath` — a
    // ! rename is a change at both keys.
    [node.path, node.newPath].forEach((path) => {
      const change = typeof path === 'string' ? toChange(path) : undefined;
      if (change != null) {
        changes.set(`${change.kind}:${change.key}`, change);
      }
    });
  });

  return [...changes.values()];
}

function toChange(path: string): PrincipalChange | undefined {
  const [root, second, third, fourth, ...rest] = path.split('/').filter((s) => s !== '');

  if (root !== 'identity' || second == null || rest.length > 0) {
    return undefined;
  }

  if (second === 'roles') {
    return third == null || fourth != null ? undefined : { kind: 'role', key: `role:${third}` };
  }

  if (third == null) {
    return { kind: 'idProvider', key: second };
  }

  if (fourth == null) {
    // The `users`/`groups` folder node itself moves with its provider, not with a principal.
    return undefined;
  }

  if (third === 'users') {
    return { kind: 'user', key: `user:${second}:${fourth}` };
  }

  if (third === 'groups') {
    return { kind: 'group', key: `group:${second}:${fourth}` };
  }

  return undefined;
}
