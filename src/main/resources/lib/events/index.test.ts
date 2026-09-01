import { readFileSync } from 'node:fs';

import { setTopic } from '/lib/xp/admin';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HUB_TOPICS } from '../../assets/js/shared/sections';
import { init } from './index';

/** Renaming the app must fail here, not silently split the publisher from its subscribers. */
function builtAppName(): string {
  const properties = readFileSync('gradle.properties', 'utf8');
  const match = /^appName\s*=\s*(.+)$/m.exec(properties);
  if (match == null) {
    throw new Error('gradle.properties carries no appName');
  }
  return match[1].trim();
}

describe('init', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers exactly the canonical topics the contract publishes', () => {
    init();

    const appName = builtAppName();
    const canonical = vi
      .mocked(setTopic)
      .mock.calls.map(([{ name }]) => `${appName}:${name}`)
      .sort();
    expect(canonical).toEqual(Object.values(HUB_TOPICS).sort());
  });
});
