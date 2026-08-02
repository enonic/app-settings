import { describe, expect, it } from 'vitest';

import {
  admit,
  EMPTY_STATE,
  isDuplicate,
  lifetimeFor,
  LONG_LIFETIME_MS,
  type Notification,
  type NotificationsState,
  remove,
  SHORT_LIFETIME_MS,
  VISIBLE_LIMIT,
} from './notifications';

function notification(id: number, text = `message ${id}`): Notification {
  return { id, tone: 'info', text, autoHide: true, lifetimeMs: SHORT_LIFETIME_MS, actions: [] };
}

function stateOf(visible: readonly Notification[], queued: readonly Notification[] = []) {
  return { visible, queued } satisfies NotificationsState;
}

describe('lifetimeFor', () => {
  it('gives a warning and an error the long lifetime', () => {
    expect(lifetimeFor('error')).toBe(LONG_LIFETIME_MS);
    expect(lifetimeFor('warning')).toBe(LONG_LIFETIME_MS);
  });

  it('gives everything else the short one', () => {
    expect(lifetimeFor('info')).toBe(SHORT_LIFETIME_MS);
    expect(lifetimeFor('success')).toBe(SHORT_LIFETIME_MS);
  });
});

describe('isDuplicate', () => {
  it('matches on tone and text together', () => {
    const state = stateOf([notification(1, 'Failed')]);

    expect(isDuplicate(state, { tone: 'info', text: 'Failed' })).toBe(true);
    expect(isDuplicate(state, { tone: 'error', text: 'Failed' })).toBe(false);
    expect(isDuplicate(state, { tone: 'info', text: 'Something else' })).toBe(false);
  });

  it('sees what is still queued', () => {
    const state = stateOf([], [notification(1, 'Failed')]);

    expect(isDuplicate(state, { tone: 'info', text: 'Failed' })).toBe(true);
  });
});

describe('admit', () => {
  it('shows a notification while there is room', () => {
    const state = admit(EMPTY_STATE, notification(1));

    expect(state.visible.map(({ id }) => id)).toEqual([1]);
    expect(state.queued).toEqual([]);
  });

  it('queues everything past the limit', () => {
    const filled = [1, 2, 3, 4].reduce((state, id) => admit(state, notification(id)), EMPTY_STATE);

    expect(filled.visible).toHaveLength(VISIBLE_LIMIT);
    expect(filled.queued.map(({ id }) => id)).toEqual([4]);
  });

  it('returns the state it was given for a duplicate', () => {
    const state = admit(EMPTY_STATE, notification(1, 'Failed'));

    expect(admit(state, notification(2, 'Failed'))).toBe(state);
  });
});

describe('remove', () => {
  it('promotes the head of the queue into the space', () => {
    const state = stateOf([notification(1), notification(2)], [notification(3), notification(4)]);

    const next = remove(state, 1);

    expect(next.visible.map(({ id }) => id)).toEqual([2, 3]);
    expect(next.queued.map(({ id }) => id)).toEqual([4]);
  });

  it('leaves the stack shorter when nothing is queued', () => {
    const next = remove(stateOf([notification(1), notification(2)]), 2);

    expect(next.visible.map(({ id }) => id)).toEqual([1]);
  });

  it('drops a queued notification without promoting anything', () => {
    const state = stateOf([notification(1)], [notification(2), notification(3)]);

    const next = remove(state, 2);

    expect(next.visible.map(({ id }) => id)).toEqual([1]);
    expect(next.queued.map(({ id }) => id)).toEqual([3]);
  });

  it('ignores an id it does not hold', () => {
    const state = stateOf([notification(1)]);

    expect(remove(state, 99).visible.map(({ id }) => id)).toEqual([1]);
  });
});
