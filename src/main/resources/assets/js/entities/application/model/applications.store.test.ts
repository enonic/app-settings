import { cleanStores, keepMount } from 'nanostores';
import { errAsync, ResultAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../../shared/api';
import { fetchApplication, fetchApplications } from '../api/applications.api';
import type { Application } from './application.types';
import {
  $applications,
  refreshApplication,
  refreshApplications,
  removeApplication,
} from './applications.store';

vi.mock('../api/applications.api', () => ({
  fetchApplications: vi.fn(),
  fetchApplication: vi.fn(),
}));

function application(key: string): Application {
  return { key, displayName: key, version: '1.0.0', state: 'STARTED', system: false };
}

const booster = application('com.enonic.app.booster');

function answersWith(applications: Application[]): void {
  vi.mocked(fetchApplications).mockReturnValueOnce(
    ResultAsync.fromSafePromise(Promise.resolve(applications)),
  );
}

function resetApi(): void {
  // A default answer, so a mount nobody planned for cannot throw instead of failing an expectation.
  vi.mocked(fetchApplications).mockReset();
  vi.mocked(fetchApplications).mockReturnValue(
    ResultAsync.fromSafePromise(Promise.resolve<Application[]>([])),
  );
  vi.mocked(fetchApplication).mockReset();
  vi.mocked(fetchApplication).mockReturnValue(
    ResultAsync.fromSafePromise(Promise.resolve<Application | undefined>(undefined)),
  );
}

function answersOneWith(application: Application | undefined): void {
  vi.mocked(fetchApplication).mockReturnValueOnce(
    ResultAsync.fromSafePromise(Promise.resolve(application)),
  );
}

/**
 * A fresh mount, which is what a first visit to the section does. `cleanStores` is what makes the
 * store unmounted again without waiting out nanostores' unmount delay.
 */
function mount(): void {
  cleanStores($applications);
  keepMount($applications);
}

async function settled(status: string): Promise<void> {
  await vi.waitFor(() => expect($applications.get().status).toBe(status));
}

describe('$applications', () => {
  beforeEach(() => {
    cleanStores($applications);
    $applications.set({ status: 'loading', items: [] });
    resetApi();
  });

  it('loads the list the first time the store is mounted', async () => {
    answersWith([booster]);

    mount();
    await settled('ready');

    expect($applications.get().items).toEqual([booster]);
    expect(fetchApplications).toHaveBeenCalledTimes(1);
  });

  it('serves the cache on a later mount, without asking the server again', async () => {
    answersWith([booster]);
    mount();
    await settled('ready');

    mount();

    expect(fetchApplications).toHaveBeenCalledTimes(1);
    expect($applications.get().items).toEqual([booster]);
  });

  it('loads again on a mount that follows a failed load', async () => {
    vi.mocked(fetchApplications).mockReturnValueOnce(errAsync(new AppError('Endpoint is down')));
    mount();
    await settled('error');
    expect($applications.get().error).toBe('Endpoint is down');

    answersWith([booster]);
    mount();
    await settled('ready');

    expect(fetchApplications).toHaveBeenCalledTimes(2);
    expect($applications.get().items).toEqual([booster]);
  });

  it('joins the load in flight when it is mounted again mid-load', async () => {
    let answerSlowly: ((applications: Application[]) => void) | undefined;
    vi.mocked(fetchApplications).mockReturnValueOnce(
      ResultAsync.fromSafePromise(
        new Promise<Application[]>((resolve) => {
          answerSlowly = resolve;
        }),
      ),
    );

    mount();
    mount();
    answerSlowly?.([booster]);
    await settled('ready');

    expect(fetchApplications).toHaveBeenCalledTimes(1);
  });
});

describe('refreshApplications', () => {
  beforeEach(() => {
    cleanStores($applications);
    resetApi();
    // Mounted on a cached list, so nothing but the test itself loads.
    $applications.set({ status: 'ready', items: [] });
    keepMount($applications);
  });

  it('reloads a list the store has already cached', async () => {
    const fathom = application('com.enonic.app.fathom');
    answersWith([fathom]);

    await refreshApplications();

    expect($applications.get().items).toEqual([fathom]);
    expect(fetchApplications).toHaveBeenCalledTimes(1);
  });

  it('reports loading while it reloads a list with nothing in it', async () => {
    const seen: string[] = [];
    const unbind = $applications.subscribe(({ status }) => seen.push(status));
    answersWith([booster]);
    await refreshApplications();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });

  it('stays ready while it reloads a list that is already on screen', async () => {
    $applications.set({ status: 'ready', items: [booster] });
    const fathom = application('com.enonic.app.fathom');
    answersWith([fathom]);

    const seen: string[] = [];
    const unbind = $applications.subscribe(({ status }) => seen.push(status));
    await refreshApplications();
    unbind();

    expect(seen).toEqual(['ready', 'ready']);
    expect($applications.get().items).toEqual([fathom]);
  });

  it('keeps the error message the request failed with', async () => {
    vi.mocked(fetchApplications).mockReturnValueOnce(errAsync(new AppError('Endpoint is down')));

    await refreshApplications();

    const { status, items, error } = $applications.get();
    expect(status).toBe('error');
    expect(items).toEqual([]);
    expect(error).toBe('Endpoint is down');
  });

  it('drops the answer of the load a newer one replaced', async () => {
    const stale = application('stale');
    const fresh = application('fresh');
    let answerSlowly: ((applications: Application[]) => void) | undefined;

    vi.mocked(fetchApplications)
      .mockReturnValueOnce(
        ResultAsync.fromSafePromise(
          new Promise<Application[]>((resolve) => {
            answerSlowly = resolve;
          }),
        ),
      )
      .mockReturnValueOnce(ResultAsync.fromSafePromise(Promise.resolve([fresh])));

    const slowLoad = refreshApplications();
    const fastLoad = refreshApplications();
    await fastLoad;
    answerSlowly?.([stale]);
    await slowLoad;

    expect($applications.get().items).toEqual([fresh]);
  });
});

describe('refreshApplication', () => {
  beforeEach(() => {
    cleanStores($applications);
    resetApi();
    $applications.set({ status: 'ready', items: [booster] });
    keepMount($applications);
  });

  it('replaces the one row it refetched', async () => {
    answersOneWith({ ...booster, state: 'STOPPED' });

    await refreshApplication(booster.key);

    expect($applications.get().items).toEqual([{ ...booster, state: 'STOPPED' }]);
    expect(fetchApplications).not.toHaveBeenCalled();
  });

  it('drops a row the server no longer has', async () => {
    answersOneWith(undefined);

    await refreshApplication(booster.key);

    expect($applications.get().items).toEqual([]);
  });

  it('inserts a row it did not have where the server ordering puts it', async () => {
    const zebra = { ...application('org.example.zebra'), displayName: 'Zebra' };
    const alpha = { ...application('org.example.alpha'), displayName: 'alpha' };
    $applications.set({ status: 'ready', items: [alpha, zebra] });
    answersOneWith({ ...application('org.example.middle'), displayName: 'Middle' });

    await refreshApplication('org.example.middle');

    expect($applications.get().items.map(({ displayName }) => displayName)).toEqual([
      'alpha',
      'Middle',
      'Zebra',
    ]);
  });

  it('keeps the stale row when the refetch fails', async () => {
    vi.mocked(fetchApplication).mockReturnValueOnce(errAsync(new AppError('Endpoint is down')));

    await refreshApplication(booster.key);

    const { status, items } = $applications.get();
    expect(status).toBe('ready');
    expect(items).toEqual([booster]);
  });

  it('does nothing before the list is cached', async () => {
    $applications.set({ status: 'loading', items: [] });

    await refreshApplication(booster.key);

    expect(fetchApplication).not.toHaveBeenCalled();
  });
});

describe('removeApplication', () => {
  beforeEach(() => {
    cleanStores($applications);
    resetApi();
    $applications.set({ status: 'ready', items: [booster] });
    keepMount($applications);
  });

  it('drops the row without asking the server', () => {
    removeApplication(booster.key);

    expect($applications.get().items).toEqual([]);
    expect(fetchApplication).not.toHaveBeenCalled();
    expect(fetchApplications).not.toHaveBeenCalled();
  });

  it('leaves a list the key is not in alone', () => {
    removeApplication('org.example.unknown');

    expect($applications.get().items).toEqual([booster]);
  });
});
