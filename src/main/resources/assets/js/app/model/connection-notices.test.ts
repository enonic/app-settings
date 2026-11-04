import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hub = vi.hoisted(() => {
  const connection = new Set<(connected: boolean) => void>();
  const sessionEnd = new Set<() => void>();
  return {
    connection,
    sessionEnd,
    subscribeConnection: (listener: (connected: boolean) => void) => {
      connection.add(listener);
      return () => connection.delete(listener);
    },
    subscribeSessionEnd: (listener: () => void) => {
      sessionEnd.add(listener);
      return () => sessionEnd.delete(listener);
    },
    report: (connected: boolean) => connection.forEach((listener) => listener(connected)),
    endSession: () => sessionEnd.forEach((listener) => listener()),
  };
});
vi.mock('../../shared/admin-events', () => ({
  subscribeConnection: hub.subscribeConnection,
  subscribeSessionEnd: hub.subscribeSessionEnd,
}));
vi.mock('../../shared/i18n', () => ({ i18n: (key: string) => key }));
const stack = vi.hoisted(() => ({ notify: vi.fn(), dismiss: vi.fn() }));
vi.mock('../../shared/notifications', () => ({ notifications: { notify: stack.notify } }));

import { startConnectionNotices } from './connection-notices';

let stop: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  stack.notify.mockReturnValue(stack.dismiss);
  stop = startConnectionNotices();
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  stack.notify.mockReset();
  stack.dismiss.mockClear();
});

describe('a lost connection', () => {
  it('is reported once it has lasted a second, and stays up', () => {
    hub.report(false);
    vi.advanceTimersByTime(999);
    expect(stack.notify).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(stack.notify).toHaveBeenCalledWith('error', 'connection.lost', { autoHide: false });
  });

  it('is not reported when it is back within the second', () => {
    hub.report(false);
    vi.advanceTimersByTime(500);
    hub.report(true);
    vi.advanceTimersByTime(5000);

    expect(stack.notify).not.toHaveBeenCalled();
  });

  it('takes its notice down when it is back', () => {
    hub.report(false);
    vi.advanceTimersByTime(1000);
    hub.report(true);

    expect(stack.dismiss).toHaveBeenCalledOnce();
  });

  it('says nothing on the first report of an open socket', () => {
    hub.report(true);
    vi.advanceTimersByTime(5000);

    expect(stack.notify).not.toHaveBeenCalled();
  });
});

describe('an ended session', () => {
  it('is reported for good with a reload, in place of a lost connection', () => {
    hub.report(false);
    vi.advanceTimersByTime(1000);
    hub.endSession();

    expect(stack.dismiss).toHaveBeenCalledOnce();
    expect(stack.notify).toHaveBeenLastCalledWith('error', 'connection.sessionEnded', {
      autoHide: false,
      actions: [{ label: 'connection.reload', onClick: expect.any(Function) }],
    });
  });

  it('is not taken down by a later connection report', () => {
    hub.endSession();
    hub.report(true);
    hub.report(false);
    vi.advanceTimersByTime(5000);

    expect(stack.notify).toHaveBeenCalledOnce();
    expect(stack.dismiss).not.toHaveBeenCalled();
  });
});

describe('stopping', () => {
  it('unsubscribes and takes the notice down', () => {
    hub.report(false);
    vi.advanceTimersByTime(1000);

    stop();

    expect(stack.dismiss).toHaveBeenCalledOnce();
    expect(hub.connection.size).toBe(0);
    expect(hub.sessionEnd.size).toBe(0);
  });
});
