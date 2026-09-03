import { hasRole } from '/lib/xp/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLE, isAdmin } from './auth';

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
