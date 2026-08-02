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
};

export type Notification = {
  id: number;
  tone: NotificationTone;
  text: string;
  autoHide: boolean;
  lifetimeMs: number;
  actions: readonly NotificationAction[];
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

/** A warning or an error is worth reading twice; the rest is confirmation of what was just done. */
export function lifetimeFor(tone: NotificationTone): number {
  return tone === 'error' || tone === 'warning' ? LONG_LIFETIME_MS : SHORT_LIFETIME_MS;
}

/**
 * The same message twice is one message. Acting on several items reports one failure per item, and
 * three identical toasts say nothing the first does not.
 */
export function isDuplicate(
  { visible, queued }: NotificationsState,
  candidate: Pick<Notification, 'tone' | 'text'>,
): boolean {
  return [...visible, ...queued].some(
    ({ tone, text }) => tone === candidate.tone && text === candidate.text,
  );
}

/** Shows the notification, or queues it while the stack is full. A duplicate changes nothing. */
export function admit(state: NotificationsState, notification: Notification): NotificationsState {
  if (isDuplicate(state, notification)) {
    return state;
  }

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
