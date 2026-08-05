import { errAsync, ResultAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../../shared/api';
import { fetchMarketApplications } from '../api/market.api';
import { ensureMarketApplications, loadMarketApplications } from './market.load';
import { $marketApplications } from './market.store';
import type { MarketApplication } from './market.types';

vi.mock('../api/market.api', () => ({ fetchMarketApplications: vi.fn() }));

function marketApplication(key: string): MarketApplication {
  return {
    key,
    displayName: key,
    latest: { version: '8.0.0', downloadUrl: `https://repo.enonic.com/${key}-8.0.0.jar` },
    versions: [{ version: '8.0.0', downloadUrl: `https://repo.enonic.com/${key}-8.0.0.jar` }],
    updateAvailable: false,
  };
}

const guillotine = marketApplication('com.enonic.app.guillotine');

function answersWith(applications: MarketApplication[]): void {
  vi.mocked(fetchMarketApplications).mockReturnValueOnce(
    ResultAsync.fromSafePromise(Promise.resolve(applications)),
  );
}

beforeEach(() => {
  vi.mocked(fetchMarketApplications).mockReset();
  vi.mocked(fetchMarketApplications).mockReturnValue(
    ResultAsync.fromSafePromise(Promise.resolve<MarketApplication[]>([])),
  );
  $marketApplications.set({ status: 'loading', items: [] });
});

describe('ensureMarketApplications', () => {
  it('reads the market the first time something asks for it', async () => {
    answersWith([guillotine]);

    await ensureMarketApplications();

    expect($marketApplications.get().items).toEqual([guillotine]);
    expect(fetchMarketApplications).toHaveBeenCalledTimes(1);
  });

  it('serves the cached catalogue rather than leaving the instance again', async () => {
    answersWith([guillotine]);
    await ensureMarketApplications();

    await ensureMarketApplications();

    expect(fetchMarketApplications).toHaveBeenCalledTimes(1);
  });

  it('joins a load already in flight instead of starting a second one', async () => {
    answersWith([guillotine]);

    await Promise.all([ensureMarketApplications(), ensureMarketApplications()]);

    expect(fetchMarketApplications).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed load, since nothing was cached', async () => {
    vi.mocked(fetchMarketApplications).mockReturnValueOnce(errAsync(new AppError('offline')));
    await ensureMarketApplications();

    await ensureMarketApplications();

    expect(fetchMarketApplications).toHaveBeenCalledTimes(2);
  });
});

describe('loadMarketApplications', () => {
  it('reads the market again even with a catalogue already loaded', async () => {
    answersWith([guillotine]);
    await ensureMarketApplications();

    answersWith([]);
    await loadMarketApplications();

    expect(fetchMarketApplications).toHaveBeenCalledTimes(2);
    expect($marketApplications.get().items).toEqual([]);
  });

  it('reports a failure as state rather than as a notification', async () => {
    vi.mocked(fetchMarketApplications).mockReturnValueOnce(errAsync(new AppError('offline')));

    await loadMarketApplications();

    expect($marketApplications.get()).toEqual({ status: 'error', items: [], error: 'offline' });
  });

  it('cancels the load it replaced and keeps the newer answer', async () => {
    answersWith([marketApplication('stale')]);
    const first = loadMarketApplications();
    answersWith([guillotine]);
    const second = loadMarketApplications();

    await Promise.all([first, second]);

    expect($marketApplications.get().items).toEqual([guillotine]);
  });

  it('passes a signal, so the transport can drop a request nobody waits for', () => {
    void loadMarketApplications();

    const [signal] = vi.mocked(fetchMarketApplications).mock.calls[0] ?? [];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
