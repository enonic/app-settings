import { describe, expect, it } from 'vitest';

import { toInstallProgress } from './install-progress';

const JAR = 'https://repo.enonic.com/booster-3.0.1.jar';

describe('toInstallProgress', () => {
  it('reads the url and percentage out of a progress event', () => {
    expect(
      toInstallProgress({
        type: 'application',
        data: { eventType: 'PROGRESS', applicationUrl: JAR, progress: 42 },
      }),
    ).toEqual({ url: JAR, percent: 42 });
  });

  // Core reports 0 for a download whose length it cannot measure, and the row shows that as
  // indeterminate rather than as no progress at all.
  it('keeps a zero percentage', () => {
    expect(
      toInstallProgress({
        type: 'application',
        data: { eventType: 'PROGRESS', applicationUrl: JAR, progress: 0 },
      }),
    ).toEqual({ url: JAR, percent: 0 });
  });

  it('ignores an application event that is not progress', () => {
    expect(
      toInstallProgress({
        type: 'application',
        data: { eventType: 'INSTALLED', applicationKey: 'com.enonic.app.booster' },
      }),
    ).toBeUndefined();
  });

  it('ignores an event of another type', () => {
    expect(toInstallProgress({ type: 'node.updated' })).toBeUndefined();
  });

  it('ignores a progress event missing either half of what it needs', () => {
    expect(
      toInstallProgress({ type: 'application', data: { eventType: 'PROGRESS', progress: 42 } }),
    ).toBeUndefined();
    expect(
      toInstallProgress({
        type: 'application',
        data: { eventType: 'PROGRESS', applicationUrl: JAR },
      }),
    ).toBeUndefined();
  });
});
