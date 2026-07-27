import { hasRole } from '/lib/xp/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLE, adminOnly, isAdmin } from './auth';

const hasRoleMock = vi.mocked(hasRole);

beforeEach(() => {
  hasRoleMock.mockReset();
});

describe('isAdmin', () => {
  it('checks the system admin role', () => {
    hasRoleMock.mockReturnValue(true);

    expect(isAdmin()).toBe(true);
    expect(hasRoleMock).toHaveBeenCalledWith(ADMIN_ROLE);
  });

  it('is false when the role is absent', () => {
    hasRoleMock.mockReturnValue(false);

    expect(isAdmin()).toBe(false);
  });
});

describe('adminOnly', () => {
  it('runs the handler for an admin and passes the request through', () => {
    hasRoleMock.mockReturnValue(true);
    const handler = vi.fn((request: { id: string }) => ({ status: 200, body: request.id }));

    const result = adminOnly(handler)({ id: 'abc' });

    expect(result).toEqual({ status: 200, body: 'abc' });
    expect(handler).toHaveBeenCalledWith({ id: 'abc' });
  });

  // XP wraps once at module load and reuses the export for every request, so the role
  // has to be read per call. Hoisting the check out of the returned function would let
  // the first caller's privileges decide for everyone after them.
  it('re-checks the role on every request, not once at wrap time', () => {
    const handler = vi.fn(() => ({ status: 200 }));
    const guarded = adminOnly(handler);

    hasRoleMock.mockReturnValue(true);
    expect(guarded(undefined)).toEqual({ status: 200 });

    hasRoleMock.mockReturnValue(false);
    expect(guarded(undefined)).toEqual({
      status: 403,
      contentType: 'application/json',
      body: { message: 'Forbidden' },
    });

    hasRoleMock.mockReturnValue(true);
    expect(guarded(undefined)).toEqual({ status: 200 });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(hasRoleMock).toHaveBeenCalledTimes(3);
  });

  it('answers 403 and never calls the handler for a non-admin', () => {
    hasRoleMock.mockReturnValue(false);
    const handler = vi.fn(() => ({ status: 200 }));

    const result = adminOnly(handler)(undefined);

    expect(result).toEqual({
      status: 403,
      contentType: 'application/json',
      body: { message: 'Forbidden' },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
