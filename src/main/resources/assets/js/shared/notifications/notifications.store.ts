import { atom, computed } from 'nanostores';

import {
  admit,
  EMPTY_STATE,
  findDuplicate,
  lifetimeFor,
  type Notification,
  type NotificationOptions,
  type NotificationsState,
  remove,
} from './notifications';

type Timer = {
  remainingMs: number;
  startedAt?: number;
  id?: ReturnType<typeof setTimeout>;
};

const $state = atom<NotificationsState>(EMPTY_STATE);

export const $notifications = computed($state, ({ visible }) => visible);

const timers = new Map<number, Timer>();

let lastId = 0;

/**
 * Shows a notification and returns its id. One just like it is not shown twice: the id of the one
 * already up comes back instead, so the caller can still take that one down.
 */
export function notify(options: NotificationOptions): number {
  const { tone = 'info', text, autoHide = true, lifetimeMs, actions = [], owner } = options;

  const duplicate = findDuplicate($state.get(), { tone, text, owner });
  if (duplicate != null) {
    return duplicate.id;
  }

  lastId += 1;
  const notification: Notification = {
    id: lastId,
    tone,
    text,
    autoHide,
    lifetimeMs: lifetimeFor(tone, lifetimeMs),
    actions,
    owner,
  };

  $state.set(admit($state.get(), notification));
  syncTimers();

  return notification.id;
}

export function notifySuccess(text: string, options: ToneOptions = {}): number {
  return notify({ ...options, tone: 'success', text });
}

export function notifyInfo(text: string, options: ToneOptions = {}): number {
  return notify({ ...options, tone: 'info', text });
}

export function notifyWarning(text: string, options: ToneOptions = {}): number {
  return notify({ ...options, tone: 'warning', text });
}

export function notifyError(text: string, options: ToneOptions = {}): number {
  return notify({ ...options, tone: 'error', text });
}

export function dismissNotification(id: number): void {
  $state.set(remove($state.get(), id));
  syncTimers();
}

/** Takes down everything one owner raised — a section mount being revoked. */
export function dismissNotifications(owner: string): void {
  const { visible, queued } = $state.get();

  [...visible, ...queued]
    .filter((notification) => notification.owner === owner)
    .forEach(({ id }) => dismissNotification(id));
}

export function clearNotifications(): void {
  $state.set(EMPTY_STATE);
  syncTimers();
}

export function pauseNotification(id: number): void {
  const timer = timers.get(id);
  if (timer?.id == null || timer.startedAt == null) {
    return;
  }

  clearTimeout(timer.id);
  timer.remainingMs = Math.max(0, timer.remainingMs - (performance.now() - timer.startedAt));
  timer.id = undefined;
  timer.startedAt = undefined;
}

/** Resumes with the time that was left, not a fresh lifetime. */
export function resumeNotification(id: number): void {
  startTimer(id);
}

// *
// * Internal
// *

type ToneOptions = Omit<NotificationOptions, 'text' | 'tone'>;

function startTimer(id: number): void {
  const timer = timers.get(id);
  if (timer == null || timer.id != null) {
    return;
  }

  if (timer.remainingMs <= 0) {
    dismissNotification(id);
    return;
  }

  timer.startedAt = performance.now();
  timer.id = setTimeout(() => dismissNotification(id), timer.remainingMs);
}

// One pass after every state change: a notification promoted out of the queue starts its lifetime
// here, so it gets the full one rather than what was left of the notification it replaced.
function syncTimers(): void {
  const { visible } = $state.get();
  const shown = new Set(visible.map(({ id }) => id));

  timers.forEach((timer, id) => {
    if (shown.has(id)) {
      return;
    }
    if (timer.id != null) {
      clearTimeout(timer.id);
    }
    timers.delete(id);
  });

  visible.forEach(({ id, autoHide, lifetimeMs }) => {
    if (!autoHide || timers.has(id)) {
      return;
    }

    timers.set(id, { remainingMs: lifetimeMs });
    startTimer(id);
  });
}
