import { csp } from '/lib/xp/portal';
import type { Csp } from '@enonic-types/lib-portal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyContentSecurityPolicy } from './csp';

/** Records what a contributor asked for, in order, as the header directive it lands in. */
type Contribution = [directive: string, ...sources: string[]];

function cspDouble(): { policy: Csp; contributions: Contribution[] } {
  const contributions: Contribution[] = [];
  const record =
    (directive: string) =>
    (...sources: string[]) => {
      contributions.push([directive, ...sources]);
      return policy;
    };

  const policy = {
    strict: record('strict'),
    scriptSrc: record('script-src'),
    styleSrc: record('style-src'),
    imgSrc: record('img-src'),
    fontSrc: record('font-src'),
    connectSrc: record('connect-src'),
    formAction: record('form-action'),
    merge: record('merge'),
    // The real builder has thirty more methods; the double covers what this module calls.
  } as unknown as Csp;

  return { policy, contributions };
}

function withAppConfig(appConfig: Record<string, string>): void {
  vi.stubGlobal('app', {
    name: 'com.enonic.xp.app.settings',
    version: '1.0.0',
    config: appConfig,
  });
}

describe('applyContentSecurityPolicy', () => {
  let double: ReturnType<typeof cspDouble>;

  beforeEach(() => {
    withAppConfig({});
    double = cspDouble();
    vi.mocked(csp).mockReturnValue(double.policy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('opens exactly the directives the shell needs, on top of a deny-all baseline', () => {
    applyContentSecurityPolicy();

    expect(double.contributions).toEqual([
      ['strict'],
      ['script-src', "'self'"],
      ['style-src', "'self'", "'unsafe-inline'"],
      ['img-src', "'self'", 'data:'],
      ['font-src', "'self'"],
      ['connect-src', "'self'"],
      ['form-action', "'none'"],
      ['merge', ''],
    ]);
  });

  it('unions the operator header last, so it can widen a baseline directive', () => {
    withAppConfig({
      'contentSecurityPolicy.header': "img-src https://cdn.example.com; frame-src 'self'",
    });

    applyContentSecurityPolicy();

    expect(double.contributions.at(-1)).toEqual([
      'merge',
      "img-src https://cdn.example.com; frame-src 'self'",
    ]);
  });

  it('contributes nothing at all when disabled, leaving every section processor inert', () => {
    withAppConfig({ 'contentSecurityPolicy.enabled': 'false' });

    applyContentSecurityPolicy();

    expect(vi.mocked(csp)).not.toHaveBeenCalled();
  });

  it('reads the switch trimmed, since a .cfg value keeps its trailing whitespace', () => {
    withAppConfig({ 'contentSecurityPolicy.enabled': 'false ' });

    applyContentSecurityPolicy();

    expect(vi.mocked(csp)).not.toHaveBeenCalled();
  });

  it('merges the operator header trimmed', () => {
    withAppConfig({ 'contentSecurityPolicy.header': " frame-src 'self' " });

    applyContentSecurityPolicy();

    expect(double.contributions.at(-1)).toEqual(['merge', "frame-src 'self'"]);
  });

  it('declares the baseline for any other value of the switch', () => {
    withAppConfig({ 'contentSecurityPolicy.enabled': 'true' });

    applyContentSecurityPolicy();

    expect(double.contributions[0]).toEqual(['strict']);
  });
});
