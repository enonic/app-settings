import { getPhrases } from '/lib/xp/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUNDLES, DEFAULT_LOCALE, getAllPhrases, resolveLocales } from './i18n';

const getPhrasesMock = vi.mocked(getPhrases);

beforeEach(() => {
  getPhrasesMock.mockReset();
});

describe('resolveLocales', () => {
  it('keeps the requested locales', () => {
    expect(resolveLocales(['no', 'en'])).toEqual(['no', 'en']);
  });

  it('falls back to the default locale when the request carries none', () => {
    expect(resolveLocales(undefined)).toEqual([DEFAULT_LOCALE]);
    expect(resolveLocales([])).toEqual([DEFAULT_LOCALE]);
  });
});

describe('getAllPhrases', () => {
  it('asks for every configured bundle with the given locales', () => {
    getPhrasesMock.mockReturnValue({ 'nav.users': 'Users' });

    expect(getAllPhrases(['en'])).toEqual({ 'nav.users': 'Users' });

    expect(getPhrasesMock).toHaveBeenCalledTimes(BUNDLES.length);
    BUNDLES.forEach((bundle) => {
      expect(getPhrasesMock).toHaveBeenCalledWith(['en'], [bundle]);
    });
  });

  it('lets a later bundle override an earlier key', () => {
    getPhrasesMock
      .mockReturnValueOnce({ shared: 'first', only: 'kept' })
      .mockReturnValueOnce({ shared: 'second' });

    const phrases = getAllPhrases(['en'], ['i18n/first', 'i18n/second']);

    expect(phrases).toEqual({ shared: 'second', only: 'kept' });
  });
});
