import { atom, computed } from 'nanostores';

import {
  admit,
  EMPTY_STATE,
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

/** The notifications on screen. What is queued behind them is not the viewport's business. */
export const $notifications = computed($state, ({ visible }) => visible);

const timers = new Map<number, Timer>();

let lastId = 0;

/** Shows a notification and returns its id, or `undefined` where one just like it is already up. */
export function notify(options: NotificationOptions): number | undefined {
  const {
    tone = 'info',
    text,
    autoHide = true,
    lifetimeMs = lifetimeFor(tone),
    actions = [],
  } = options;

  lastId += 1;
  const notification: Notification = { id: lastId, tone, text, autoHide, lifetimeMs, actions };

  const next = admit($state.get(), notification);
  if (next === $state.get()) {
    return undefined;
  }

  $state.set(next);
  syncTimers();

  return notification.id;
}

export function notifySuccess(text: string, options: ToneOptions = {}): number | undefined {
  return notify({ ...options, tone: 'success', text });
}

export function notifyInfo(text: string, options: ToneOptions = {}): number | undefined {
  return notify({ ...options, tone: 'info', text });
}

export function notifyWarning(text: string, options: ToneOptions = {}): number | undefined {
  return notify({ ...options, tone: 'warning', text });
}

export function notifyError(text: string, options: ToneOptions = {}): number | undefined {
  return notify({ ...options, tone: 'error', text });
}

export function dismissNotification(id: number): void {
  $state.set(remove($state.get(), id));
  syncTimers();
}

export function clearNotifications(): void {
  $state.set(EMPTY_STATE);
  syncTimers();
}

/** Hovering holds a notification on screen: it is being read. */
export function pauseNotification(id: number): void {
  const timer = timers.get(id);
  if (timer?.id == null || timer.startedAt == null) {
    return;
  }

  clearTimeout(timer.id);
  timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt));
  timer.id = undefined;
  timer.startedAt = undefined;
}

/** Resumes with the time that was left, not a fresh lifetime. */
export function resumeNotification(id: number): void {
  startTimer(id);
}

//
// * Internal
//

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

  timer.startedAt = Date.now();
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
