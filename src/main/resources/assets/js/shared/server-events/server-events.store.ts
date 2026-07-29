import { atom } from 'nanostores';

export const $serverEventsConnected = atom(false);

export function setServerEventsConnected(connected: boolean): void {
  $serverEventsConnected.set(connected);
}
