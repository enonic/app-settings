import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SectionHost, Unmount } from './contract';
import { mountSection, type MountSectionOptions } from './mount-section';

// None of these is read by the sequence under test: the container is the guest's business, the host
// object is passed through untouched, and the element only reaches `openContainer`.
const element = {} as HTMLElement;
const container = {} as HTMLElement;
const host = {} as SectionHost;

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function moduleWith(unmount: Unmount = () => undefined) {
  const mount = vi.fn(() => unmount);
  return { module: { mount }, mount };
}

/** The browser parts are stubbed out; every test overrides what it is about. */
function options(overrides: Partial<MountSectionOptions> = {}): MountSectionOptions {
  return {
    moduleUrl: 'main.js',
    element,
    host,
    openContainer: () => container,
    importModule: () => Promise.resolve(moduleWith().module),
    ...overrides,
  };
}

describe('mountSection', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('hands the container and the host object to the module it imported', async () => {
    const { module, mount } = moduleWith();

    mountSection(options({ importModule: () => Promise.resolve(module) }));
    await flush();

    expect(mount).toHaveBeenCalledWith({ container, host });
  });

  it('does not mount a module that arrives after the section was left', async () => {
    const { module, mount } = moduleWith();
    let arrive: (value: unknown) => void = () => undefined;

    const dispose = mountSection(
      options({ importModule: () => new Promise((resolve) => (arrive = resolve)) }),
    );
    dispose();
    arrive(module);
    await flush();

    expect(mount).not.toHaveBeenCalled();
  });

  it('reports a module that exports no mount function', async () => {
    const onFail = vi.fn();

    mountSection(options({ onFail, importModule: () => Promise.resolve({ notMount: true }) }));
    await flush();

    expect(onFail).toHaveBeenCalledOnce();
  });

  it('reports an import that fails', async () => {
    const onFail = vi.fn();

    mountSection(options({ onFail, importModule: () => Promise.reject(new Error('404')) }));
    await flush();

    expect(onFail).toHaveBeenCalledOnce();
  });

  it('reports a module that never answers, rather than waiting for ever', async () => {
    vi.useFakeTimers();
    const onFail = vi.fn();

    mountSection(
      options({ onFail, timeoutMs: 50, importModule: () => new Promise(() => undefined) }),
    );
    await vi.advanceTimersByTimeAsync(50);

    expect(onFail).toHaveBeenCalledOnce();
  });

  it('reports a mount that throws, and leaves nothing to dispose', async () => {
    const onFail = vi.fn();
    const mount = vi.fn(() => {
      throw new Error('boom');
    });

    const dispose = mountSection(
      options({ onFail, importModule: () => Promise.resolve({ mount }) }),
    );
    await flush();

    expect(onFail).toHaveBeenCalledOnce();
    expect(() => dispose()).not.toThrow();
  });

  it("calls the guest's unmount once, however often it is disposed", async () => {
    const unmount = vi.fn();
    const { module } = moduleWith(unmount);

    const dispose = mountSection(options({ importModule: () => Promise.resolve(module) }));
    await flush();
    dispose();
    dispose();

    expect(unmount).toHaveBeenCalledOnce();
  });

  it('swallows an unmount that throws', async () => {
    const { module } = moduleWith(() => {
      throw new Error('boom');
    });

    const dispose = mountSection(options({ importModule: () => Promise.resolve(module) }));
    await flush();

    expect(() => dispose()).not.toThrow();
  });
});
