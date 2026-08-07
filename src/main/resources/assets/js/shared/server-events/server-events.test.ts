import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  connectToServerEvents,
  isRelevantServerEvent,
  onServerEvent,
  parseServerEvent,
  reconnectDelay,
  type ServerEvent,
} from './server-events';
import { $serverEventsConnected } from './server-events.store';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  static get last(): FakeWebSocket | undefined {
    return FakeWebSocket.instances.at(-1);
  }

  readonly listeners = new Map<string, ((event: unknown) => void)[]>();
  readonly sent: string[] = [];
  closed = false;

  constructor(
    readonly url: string,
    readonly protocols?: string | string[],
  ) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, event: unknown = {}): void {
    [...(this.listeners.get(type) ?? [])].forEach((listener) => listener(event));
  }

  message(payload: unknown): void {
    this.emit('message', { data: JSON.stringify(payload) });
  }
}

const STABLE_MS_IN_TEST = 30000;

function nodeEvent(
  repo: string,
  path = '/identity/users/system/alice',
  type = 'node.updated',
): ServerEvent {
  return {
    type,
    timestamp: 1,
    data: { nodes: [{ id: 'a', path, branch: 'master', repo }] },
  };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  $serverEventsConnected.set(false);
});

describe('parseServerEvent', () => {
  it('parses the shape XP EventJsonSerializer produces', () => {
    const raw = JSON.stringify(nodeEvent('system-repo'));

    expect(parseServerEvent(raw)).toEqual(nodeEvent('system-repo'));
  });

  it('rejects malformed JSON instead of throwing', () => {
    expect(parseServerEvent('{not json')).toBeUndefined();
  });

  it('rejects payloads without a string type', () => {
    expect(parseServerEvent(JSON.stringify({ timestamp: 1 }))).toBeUndefined();
    expect(parseServerEvent(JSON.stringify({ type: 7 }))).toBeUndefined();
    expect(parseServerEvent(JSON.stringify(null))).toBeUndefined();
    expect(parseServerEvent(JSON.stringify('node.updated'))).toBeUndefined();
  });
});

describe('isRelevantServerEvent', () => {
  it('accepts application lifecycle events', () => {
    expect(isRelevantServerEvent({ type: 'application', data: { eventType: 'INSTALLED' } })).toBe(
      true,
    );
    expect(isRelevantServerEvent({ type: 'application', data: { eventType: 'STARTED' } })).toBe(
      true,
    );
    expect(isRelevantServerEvent({ type: 'application', data: { eventType: 'UNINSTALLED' } })).toBe(
      true,
    );
    expect(isRelevantServerEvent({ type: 'application' })).toBe(true);
  });

  it('accepts the per-percent PROGRESS burst fired while an app downloads', () => {
    expect(
      isRelevantServerEvent({
        type: 'application',
        data: { eventType: 'PROGRESS', applicationUrl: 'https://host/app.jar', progress: 42 },
      }),
    ).toBe(true);
  });

  it('accepts any node event under /identity in the system repo', () => {
    expect(isRelevantServerEvent(nodeEvent('system-repo', '/identity', 'node.created'))).toBe(true);
    expect(
      isRelevantServerEvent(nodeEvent('system-repo', '/identity/roles/cms.admin', 'node.pushed')),
    ).toBe(true);
    expect(
      isRelevantServerEvent(nodeEvent('system-repo', '/identity/groups/dev', 'node.deleted')),
    ).toBe(true);
  });

  it('rejects other system-repo paths', () => {
    expect(isRelevantServerEvent(nodeEvent('system-repo', '/repository/com.enonic.cms.foo'))).toBe(
      false,
    );
    expect(isRelevantServerEvent(nodeEvent('system-repo', '/applications/myapp'))).toBe(false);
    expect(isRelevantServerEvent(nodeEvent('system-repo', '/keys/generic-hmac-sha512'))).toBe(
      false,
    );
  });

  it('does not treat a path merely starting with the same letters as /identity', () => {
    expect(isRelevantServerEvent(nodeEvent('system-repo', '/identityproviders/x'))).toBe(false);
  });

  it('rejects /identity in another repo', () => {
    expect(isRelevantServerEvent(nodeEvent('com.enonic.cms.default', '/identity/users/a'))).toBe(
      false,
    );
  });

  it('rejects node events carrying no nodes', () => {
    expect(isRelevantServerEvent({ type: 'node.updated', data: {} })).toBe(false);
    expect(isRelevantServerEvent({ type: 'node.updated' })).toBe(false);
  });

  it('rejects unrelated event types from the firehose', () => {
    expect(isRelevantServerEvent({ type: 'task.updated' })).toBe(false);
    expect(isRelevantServerEvent({ type: 'repository.updated' })).toBe(false);
    expect(isRelevantServerEvent({ type: 'content.published' })).toBe(false);
  });
});

describe('connectToServerEvents', () => {
  it('connects to the given url with the text subprotocol', () => {
    const disconnect = connectToServerEvents('ws://localhost:8080/admin/tool/_/admin:event');

    expect(FakeWebSocket.last?.url).toBe('ws://localhost:8080/admin/tool/_/admin:event');
    expect(FakeWebSocket.last?.protocols).toBe('text');

    disconnect();
  });

  it('delivers a relevant event to every subscriber', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = onServerEvent(first);
    const unsubscribeSecond = onServerEvent(second);

    const disconnect = connectToServerEvents('ws://host/events');
    FakeWebSocket.last?.message({ type: 'application' });

    expect(first).toHaveBeenCalledWith({ type: 'application' });
    expect(second).toHaveBeenCalledWith({ type: 'application' });

    unsubscribeFirst();
    unsubscribeSecond();
    disconnect();
  });

  it('drops irrelevant events before they reach subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = onServerEvent(listener);

    const disconnect = connectToServerEvents('ws://host/events');
    FakeWebSocket.last?.message(nodeEvent('com.enonic.cms.default'));
    FakeWebSocket.last?.message(nodeEvent('system-repo', '/repository/com.enonic.cms.foo'));
    FakeWebSocket.last?.message({ type: 'task.updated' });
    FakeWebSocket.last?.message('{not json');

    expect(listener).not.toHaveBeenCalled();

    FakeWebSocket.last?.message(nodeEvent('system-repo'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    disconnect();
  });

  it('stops delivering to a listener after it unsubscribes', () => {
    const listener = vi.fn();
    onServerEvent(listener)();

    const disconnect = connectToServerEvents('ws://host/events');
    FakeWebSocket.last?.message({ type: 'application' });

    expect(listener).not.toHaveBeenCalled();
    disconnect();
  });

  it('tracks the connection flag on open and on close', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    expect($serverEventsConnected.get()).toBe(false);

    FakeWebSocket.last?.emit('open');
    expect($serverEventsConnected.get()).toBe(true);

    FakeWebSocket.last?.emit('close');
    expect($serverEventsConnected.get()).toBe(false);

    disconnect();
  });

  it('reconnects after a drop', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    expect(FakeWebSocket.instances).toHaveLength(1);

    FakeWebSocket.last?.emit('close');
    vi.advanceTimersByTime(1000);

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.last?.url).toBe('ws://host/events');

    const listener = vi.fn();
    const unsubscribe = onServerEvent(listener);
    FakeWebSocket.last?.message({ type: 'application' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    disconnect();
  });

  it('schedules only one reconnect when error and close both fire', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    FakeWebSocket.last?.emit('error');
    FakeWebSocket.last?.emit('close');
    vi.advanceTimersByTime(1000);

    expect(FakeWebSocket.instances).toHaveLength(2);

    disconnect();
  });

  it('does not reconnect after disconnect', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    const socket = FakeWebSocket.last;

    disconnect();
    socket?.emit('close');
    vi.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket?.closed).toBe(true);
    expect($serverEventsConnected.get()).toBe(false);
  });

  it('cancels a pending reconnect when disconnected mid-wait', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    FakeWebSocket.last?.emit('close');
    disconnect();
    vi.advanceTimersByTime(60000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('backs off exponentially across repeated failures', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    [1000, 2000, 4000, 8000].forEach((delay, index) => {
      FakeWebSocket.last?.emit('close');

      vi.advanceTimersByTime(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(index + 1);

      vi.advanceTimersByTime(1);
      expect(FakeWebSocket.instances).toHaveLength(index + 2);
    });

    disconnect();
  });

  it('restarts the backoff only once a connection has held', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    FakeWebSocket.last?.emit('close');
    vi.advanceTimersByTime(1000);
    FakeWebSocket.last?.emit('close');
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);

    FakeWebSocket.last?.emit('open');
    vi.advanceTimersByTime(STABLE_MS_IN_TEST);
    FakeWebSocket.last?.emit('close');

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(4);

    disconnect();
  });

  it('keeps backing off when the server accepts the handshake then drops it', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    [1000, 2000, 4000, 8000].forEach((delay, index) => {
      FakeWebSocket.last?.emit('open');
      FakeWebSocket.last?.emit('close');

      vi.advanceTimersByTime(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(index + 1);

      vi.advanceTimersByTime(1);
      expect(FakeWebSocket.instances).toHaveLength(index + 2);
    });

    disconnect();
  });

  it('does not restart the backoff if the connection dies before it stabilises', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    FakeWebSocket.last?.emit('close');
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.last?.emit('open');
    vi.advanceTimersByTime(STABLE_MS_IN_TEST - 1);
    FakeWebSocket.last?.emit('close');

    vi.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    disconnect();
  });

  it('registers exactly one handler per socket event', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    const socket = FakeWebSocket.last;

    expect(socket?.listenerCount('open')).toBe(1);
    expect(socket?.listenerCount('close')).toBe(1);
    expect(socket?.listenerCount('error')).toBe(1);
    expect(socket?.listenerCount('message')).toBe(1);

    disconnect();
  });
});

describe('reconnectDelay', () => {
  it('doubles per attempt', () => {
    expect(reconnectDelay(0)).toBe(1000);
    expect(reconnectDelay(1)).toBe(2000);
    expect(reconnectDelay(2)).toBe(4000);
    expect(reconnectDelay(3)).toBe(8000);
    expect(reconnectDelay(4)).toBe(16000);
  });

  it('caps so a long outage is not hammered', () => {
    expect(reconnectDelay(5)).toBe(30000);
    expect(reconnectDelay(20)).toBe(30000);
  });
});

describe('keep alive', () => {
  it('sends nothing until the connection opens', () => {
    const disconnect = connectToServerEvents('ws://host/events');

    vi.advanceTimersByTime(120000);

    expect(FakeWebSocket.last?.sent).toEqual([]);
    disconnect();
  });

  it('sends a frame every 30s while open', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    FakeWebSocket.last?.emit('open');

    vi.advanceTimersByTime(29999);
    expect(FakeWebSocket.last?.sent).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.last?.sent).toEqual(['KeepAlive']);

    vi.advanceTimersByTime(30000);
    expect(FakeWebSocket.last?.sent).toEqual(['KeepAlive', 'KeepAlive']);

    disconnect();
  });

  it('stops on close and resumes on the reconnected socket', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    const first = FakeWebSocket.last;
    first?.emit('open');
    vi.advanceTimersByTime(30000);
    expect(first?.sent).toEqual(['KeepAlive']);

    first?.emit('close');
    vi.advanceTimersByTime(120000);
    expect(first?.sent).toEqual(['KeepAlive']);

    const second = FakeWebSocket.last;
    expect(second).not.toBe(first);
    second?.emit('open');
    vi.advanceTimersByTime(30000);
    expect(second?.sent).toEqual(['KeepAlive']);

    disconnect();
  });

  it('stops after disconnect', () => {
    const disconnect = connectToServerEvents('ws://host/events');
    const socket = FakeWebSocket.last;
    socket?.emit('open');

    disconnect();
    vi.advanceTimersByTime(120000);

    expect(socket?.sent).toEqual([]);
  });
});
