import { map } from 'nanostores';

export type MarketInstall = {
  /** The download core is working through, and what its progress events are keyed by. */
  url: string;
  /**
   * How much of the download is done, 0–100. Undefined until the first event arrives, and stuck at 0
   * where the download has no content length for core to measure against.
   */
  percent?: number;
};

/**
 * The installs in flight, by market key.
 *
 * ? A store rather than dialog state: an install outlives the dialog it was started from — closing it
 * ? does not cancel a download core has already begun — and the row has to still be installing when
 * ? the operator comes back.
 */
export const $marketInstalls = map<Record<string, MarketInstall>>({});

export function beginInstall(key: string, url: string): void {
  $marketInstalls.setKey(key, { url });
}

/**
 * Records progress against whichever row is installing that url. Core reports the url it is fetching
 * and nothing else, so an event for a download this app did not start is dropped.
 */
export function receiveInstallProgress(url: string, percent: number): void {
  const installs = $marketInstalls.get();
  const key = Object.keys(installs).find((candidate) => installs[candidate]?.url === url);
  if (key == null) {
    return;
  }

  $marketInstalls.setKey(key, { url, percent });
}

export function endInstall(key: string): void {
  const { [key]: _ended, ...rest } = $marketInstalls.get();
  $marketInstalls.set(rest);
}

export function isInstalling(key: string): boolean {
  return $marketInstalls.get()[key] != null;
}
