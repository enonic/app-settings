import type {
  FindPrincipalsParams,
  FindPrincipalsResult,
  Group,
  GroupKey,
  IdProvider,
  Role,
  RoleKey,
  User,
  UserKey,
} from '@enonic-types/lib-auth';
import { vi } from 'vitest';

export const hasRole = vi.fn<(role: string) => boolean>();

export const getIdProviders = vi.fn<() => IdProvider[]>();

export const findPrincipals = vi.fn<(params: FindPrincipalsParams) => FindPrincipalsResult>();

export const getMembers = vi.fn<(principalKey: GroupKey | RoleKey) => (User | Group)[]>();

export const getMemberships =
  vi.fn<(principalKey: GroupKey | UserKey, transitive?: boolean) => (Group | Role)[]>();
