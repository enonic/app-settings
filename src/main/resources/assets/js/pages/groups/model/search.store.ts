import { atom } from 'nanostores';

export const $groupsQuery = atom<string>('');

export function setGroupsQuery(query: string): void {
  $groupsQuery.set(query);
}

export function clearGroupsQuery(): void {
  setGroupsQuery('');
}
