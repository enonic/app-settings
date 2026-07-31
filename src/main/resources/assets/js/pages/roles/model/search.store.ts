import { atom } from 'nanostores';

export const $rolesQuery = atom<string>('');

export function setRolesQuery(query: string): void {
  $rolesQuery.set(query);
}

export function clearRolesQuery(): void {
  setRolesQuery('');
}
