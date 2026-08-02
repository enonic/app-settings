import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LONG_LIFETIME_MS, SHORT_LIFETIME_MS, VISIBLE_LIMIT } from './notifications';
import {
  $notifications,
  clearNotifications,
  dismissNotification,
  notify,
  notifyError,
  notifySuccess,
  pauseNotification,
  resumeNotification,
} from './notifications.store';

function texts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

function show(text: string): number {
  const id = notify({ text });
  if (id == null) {
    throw new Error(`"${text}" was dropped as a duplicate`);
  }
  return id;
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

  it('returns undefined for one just like it, and shows it once', () => {
    notifyError('Could not start');

    expect(notifyError('Could not start')).toBeUndefined();
    expect(texts()).toEqual(['Could not start']);
  });

  it('tells the same text in two tones apart', () => {
    notifyError('Busy');
    notifySuccess('Busy');

    expect($notifications.get().map(({ tone }) => tone)).toEqual(['error', 'success']);
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
});

describe('dismissNotification', () => {
  it('drops the notification and its timer', () => {
    const first = show('Saved');
    show('Deleted');

    dismissNotification(first);
    expect(texts()).toEqual(['Deleted']);

    vi.advanceTimersByTime(SHORT_LIFETIME_MS);
    expect(texts()).toEqual([]);
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
