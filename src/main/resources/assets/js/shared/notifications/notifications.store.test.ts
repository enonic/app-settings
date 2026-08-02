import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LONG_LIFETIME_MS, SHORT_LIFETIME_MS, VISIBLE_LIMIT } from './notifications';
import {
  $notifications,
  clearNotifications,
  dismissNotification,
  notify,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
  pauseNotification,
  resumeNotification,
} from './notifications.store';

function texts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

function show(text: string): number {
  return notify({ text });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  clearNotifications();
  vi.useRealTimers();
});

describe('notify', () => {
  it('shows the notification and returns its id', () => {
    const id = notify({ text: 'Saved' });

    expect(id).toBeTypeOf('number');
    expect(texts()).toEqual(['Saved']);
  });

  it('shows one just like it once, and hands back the id of the one already up', () => {
    const id = notifyError('Could not start');

    expect(notifyError('Could not start')).toBe(id);
    expect(texts()).toEqual(['Could not start']);
  });

  it('hands back an id that still takes the notification down', () => {
    notifyError('Live updates unavailable', { autoHide: false });

    dismissNotification(notifyError('Live updates unavailable', { autoHide: false }));

    expect(texts()).toEqual([]);
  });

  it('hands back the id of a duplicate waiting in the queue', () => {
    for (let index = 0; index <= VISIBLE_LIMIT; index++) {
      show(`message ${index}`);
    }
    const queued = show(`message ${VISIBLE_LIMIT}`);

    dismissNotification(queued);
    vi.advanceTimersByTime(SHORT_LIFETIME_MS);

    expect(texts()).toEqual([]);
  });

  it('tells the same text in two tones apart', () => {
    notifyError('Busy');
    notifySuccess('Busy');

    expect($notifications.get().map(({ tone }) => tone)).toEqual(['error', 'success']);
  });

  it('gives each helper its own tone', () => {
    notifyWarning('Running out of space');
    notifyInfo('Reindexing');

    expect($notifications.get().map(({ tone }) => tone)).toEqual(['warning', 'info']);
  });

  it('spends no id on one it dropped', () => {
    const first = show('Saved');
    notify({ text: 'Saved' });

    expect(show('Deleted')).toBe(first + 1);
  });

  it('carries the actions through', () => {
    const onClick = vi.fn();

    notify({ text: 'Deleted', actions: [{ label: 'Undo', onClick }] });

    expect($notifications.get()[0]?.actions).toEqual([{ label: 'Undo', onClick }]);
  });
});

describe('lifetimes', () => {
  it('hides an info notification after the short lifetime', () => {
    show('Saved');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS - 1);
    expect(texts()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('keeps an error up for the long lifetime', () => {
    notifyError('Could not start');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(texts()).toEqual(['Could not start']);

    vi.advanceTimersByTime(LONG_LIFETIME_MS - SHORT_LIFETIME_MS);
    expect(texts()).toEqual([]);
  });

  it('leaves a notification that does not auto-hide alone', () => {
    notify({ text: 'Working', autoHide: false });

    vi.advanceTimersByTime(LONG_LIFETIME_MS * 2);
    expect(texts()).toEqual(['Working']);
  });

  it('hides after the lifetime it was given', () => {
    notify({ text: 'Saved', lifetimeMs: 1000 });

    vi.advanceTimersByTime(999);
    expect(texts()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('shows a notification asked to live no time at all for the tone lifetime instead', () => {
    notify({ text: 'Saved', lifetimeMs: 0 });

    expect(texts()).toEqual(['Saved']);

    vi.advanceTimersByTime(SHORT_LIFETIME_MS - 1);
    expect(texts()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });
});

describe('pause and resume', () => {
  it('holds the notification while it is paused', () => {
    const id = show('Saved');
    vi.advanceTimersByTime(1000);
    pauseNotification(id);

    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);

    expect(texts()).toEqual(['Saved']);
  });

  it('resumes with the time that was left', () => {
    const id = show('Saved');
    vi.advanceTimersByTime(4000);
    pauseNotification(id);
    resumeNotification(id);

    vi.advanceTimersByTime(999);
    expect(texts()).toEqual(['Saved']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('stays paused while the notification next to it comes and goes', () => {
    const read = show('Saved');
    const other = show('Deleted');
    pauseNotification(read);

    dismissNotification(other);
    show('Installed');
    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 2);

    expect(texts()).toEqual(['Saved']);
  });
});

describe('the queue', () => {
  it('promotes a queued notification and starts its lifetime then, not when it was raised', () => {
    show('first');
    vi.advanceTimersByTime(1000);
    show('second');
    vi.advanceTimersByTime(1000);
    show('third');
    show('fourth');

    expect(texts()).toEqual(['first', 'second', 'third']);

    // `first` expires at 5000 and `fourth` takes its place, so its own lifetime runs to 10000.
    vi.advanceTimersByTime(3000);
    expect(texts()).toEqual(['second', 'third', 'fourth']);

    vi.advanceTimersByTime(4999);
    expect(texts()).toEqual(['fourth']);

    vi.advanceTimersByTime(1);
    expect(texts()).toEqual([]);
  });

  it('lets nothing raised later overtake what is already waiting', () => {
    for (let index = 0; index < VISIBLE_LIMIT; index++) {
      show(`message ${index}`);
    }
    show('waiting');
    show('later');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);

    expect(texts()).toEqual(['waiting', 'later']);
  });

  it('waits for a stack that will not clear on its own to be closed by hand', () => {
    const first = notify({ text: 'first', autoHide: false });
    notify({ text: 'second', autoHide: false });
    notify({ text: 'third', autoHide: false });
    show('waiting');

    vi.advanceTimersByTime(SHORT_LIFETIME_MS * 4);
    expect(texts()).toEqual(['first', 'second', 'third']);

    dismissNotification(first);
    expect(texts()).toEqual(['second', 'third', 'waiting']);
  });
});

describe('dismissNotification', () => {
  it('drops the notification and leaves the rest to live out their own lifetimes', () => {
    const first = show('Saved');
    show('Deleted');

    dismissNotification(first);
    expect(texts()).toEqual(['Deleted']);

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(texts()).toEqual([]);
  });
});

describe('clearNotifications', () => {
  it('empties the queue behind the stack as well', () => {
    for (let index = 0; index <= VISIBLE_LIMIT; index++) {
      show(`message ${index}`);
    }

    clearNotifications();
    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(texts()).toEqual([]);

    show(`message ${VISIBLE_LIMIT}`);
    expect(texts()).toEqual([`message ${VISIBLE_LIMIT}`]);
  });
});

describe('VISIBLE_LIMIT', () => {
  it('never shows more than the limit at once', () => {
    for (let index = 0; index <= VISIBLE_LIMIT; index++) {
      show(`message ${index}`);
    }

    expect(texts()).toHaveLength(VISIBLE_LIMIT);
  });
});
