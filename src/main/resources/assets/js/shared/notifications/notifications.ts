export type NotificationTone = 'success' | 'info' | 'warning' | 'error';

export type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type NotificationOptions = {
  tone?: NotificationTone;
  text: string;
  autoHide?: boolean;
  lifetimeMs?: number;
  actions?: readonly NotificationAction[];
  /** Who raised it, where something can be revoked — a section mount. */
  owner?: string;
};

export type Notification = {
  id: number;
  tone: NotificationTone;
  text: string;
  autoHide: boolean;
  lifetimeMs: number;
  actions: readonly NotificationAction[];
  owner?: string;
};

export type NotificationsState = {
  visible: readonly Notification[];
  queued: readonly Notification[];
};

export const EMPTY_STATE: NotificationsState = { visible: [], queued: [] };

/** Beyond this many at once the stack covers the screen it is reporting on. */
export const VISIBLE_LIMIT = 3;

export const SHORT_LIFETIME_MS = 5000;

export const LONG_LIFETIME_MS = 30_000;

export function isUrgent(tone: NotificationTone): boolean {
  return tone === 'error' || tone === 'warning';
}

/**
 * The requested lifetime, or the tone's own — a warning or an error is worth reading twice. Only a
 * positive finite one is taken: `setTimeout` waits no time at all for both zero and `Infinity`.
 */
export function lifetimeFor(tone: NotificationTone, requestedMs?: number): number {
  if (requestedMs != null && Number.isFinite(requestedMs) && requestedMs > 0) {
    return requestedMs;
  }

  return isUrgent(tone) ? LONG_LIFETIME_MS : SHORT_LIFETIME_MS;
}

/**
 * Acting on several items reports one failure per item; three identical toasts say it once. Owners
 * are told apart: two sections saying the same thing each keep an id they can take down.
 */
export function findDuplicate(
  { visible, queued }: NotificationsState,
  candidate: Pick<Notification, 'tone' | 'text' | 'owner'>,
): Notification | undefined {
  return [...visible, ...queued].find(
    ({ tone, text, owner }) =>
      tone === candidate.tone && text === candidate.text && owner === candidate.owner,
  );
}

/** Shows the notification, or queues it while the stack is full. Deduplication is the caller's. */
export function admit(state: NotificationsState, notification: Notification): NotificationsState {
  if (state.visible.length < VISIBLE_LIMIT) {
    return { ...state, visible: [...state.visible, notification] };
  }

  return { ...state, queued: [...state.queued, notification] };
}

/** Drops the notification and promotes the head of the queue into the space it left. */
export function remove(state: NotificationsState, id: number): NotificationsState {
  const visible = state.visible.filter((notification) => notification.id !== id);

  if (visible.length === state.visible.length) {
    return { ...state, queued: state.queued.filter((notification) => notification.id !== id) };
  }

  const [next, ...queued] = state.queued;

  return next === undefined ? { ...state, visible } : { visible: [...visible, next], queued };
}
