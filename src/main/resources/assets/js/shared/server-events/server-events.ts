import { setServerEventsConnected } from './server-events.store';

const SUB_PROTOCOL = 'text';

const KEEP_ALIVE_MESSAGE = 'KeepAlive';

const KEEP_ALIVE_INTERVAL_MS = 30000;

const INITIAL_RECONNECT_DELAY_MS = 1000;

const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * A connection has to survive this long before it counts as healthy. Resetting the
 * backoff on `open` alone lets a server that accepts the handshake and drops it —
 * an app redeploy, a proxy that hangs up after upgrading — spin at the shortest
 * delay forever, which is the one case the backoff exists to prevent.
 */
const STABLE_CONNECTION_MS = 30000;

export function reconnectDelay(attempt: number): number {
  return Math.min(2 ** attempt * INITIAL_RECONNECT_DELAY_MS, MAX_RECONNECT_DELAY_MS);
}

export const SYSTEM_REPO = 'system-repo';
export const IDENTITY_PATH = '/identity';
export const APPLICATION_EVENT = 'application';
export const PROGRESS_EVENT_TYPE = 'PROGRESS';

const NODE_EVENT_PREFIX = 'node.';

export type ServerEventNode = {
  id: string;
  path: string;
  branch: string;
  repo: string;
  newPath?: string;
};

export type ServerEventData = {
  nodes?: ServerEventNode[];
  state?: string;
  eventType?: string;
  applicationKey?: string;
  applicationUrl?: string;
  progress?: number;
  [key: string]: unknown;
};

export type ServerEvent = {
  type: string;
  timestamp?: number;
  data?: ServerEventData;
};

export type ServerEventListener = (event: ServerEvent) => void;

const listeners = new Set<ServerEventListener>();

export function onServerEvent(listener: ServerEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function parseServerEvent(raw: string): ServerEvent | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (
    parsed == null ||
    typeof parsed !== 'object' ||
    typeof (parsed as ServerEvent).type !== 'string'
  ) {
    return undefined;
  }

  return parsed as ServerEvent;
}

export function isPrincipalNode(node: ServerEventNode): boolean {
  return (
    node.repo === SYSTEM_REPO &&
    (node.path === IDENTITY_PATH || node.path.startsWith(`${IDENTITY_PATH}/`))
  );
}

export function isRelevantServerEvent(event: ServerEvent): boolean {
  if (event.type === APPLICATION_EVENT) {
    return true;
  }
  if (!event.type.startsWith(NODE_EVENT_PREFIX)) {
    return false;
  }
  return event.data?.nodes?.some(isPrincipalNode) ?? false;
}

function dispatch(event: ServerEvent): void {
  listeners.forEach((listener) => {
    listener(event);
  });
}

export function connectToServerEvents(url: string): () => void {
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  let attempt = 0;
  let isOpen = false;
  let disconnected = false;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;

  const stopStableTimer = (): void => {
    if (stableTimer !== undefined) {
      clearTimeout(stableTimer);
      stableTimer = undefined;
    }
  };

  const stopKeepAlive = (): void => {
    if (keepAliveTimer !== undefined) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = undefined;
    }
  };

  const startKeepAlive = (): void => {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (isOpen) {
        socket?.send(KEEP_ALIVE_MESSAGE);
      }
    }, KEEP_ALIVE_INTERVAL_MS);
  };

  const scheduleReconnect = (): void => {
    isOpen = false;
    stopKeepAlive();
    stopStableTimer();
    setServerEventsConnected(false);
    if (disconnected || reconnectTimer !== undefined) {
      return;
    }
    const delay = reconnectDelay(attempt);
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      openSocket();
    }, delay);
  };

  function openSocket(): void {
    socket = new WebSocket(url, SUB_PROTOCOL);

    socket.addEventListener('open', () => {
      isOpen = true;
      setServerEventsConnected(true);
      startKeepAlive();
      stableTimer = setTimeout(() => {
        stableTimer = undefined;
        attempt = 0;
      }, STABLE_CONNECTION_MS);
    });

    socket.addEventListener('message', (message: MessageEvent<string>) => {
      const event = parseServerEvent(message.data);
      if (event && isRelevantServerEvent(event)) {
        dispatch(event);
      }
    });

    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', scheduleReconnect);
  }

  openSocket();

  return () => {
    disconnected = true;
    isOpen = false;
    stopKeepAlive();
    stopStableTimer();
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    socket?.close();
    setServerEventsConnected(false);
  };
}
