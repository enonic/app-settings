import { hasRole } from '/lib/xp/auth';

export const ADMIN_ROLE = 'role:system.admin';

export type ForbiddenResponse = {
  status: 403;
  contentType: 'application/json';
  body: { message: string };
};

export function isAdmin(): boolean {
  return hasRole(ADMIN_ROLE);
}

export function forbidden(): ForbiddenResponse {
  return {
    status: 403,
    contentType: 'application/json',
    body: { message: 'Forbidden' },
  };
}

export function adminOnly<Request, Response>(
  handler: (request: Request) => Response,
): (request: Request) => Response | ForbiddenResponse {
  return (request: Request) => (isAdmin() ? handler(request) : forbidden());
}
