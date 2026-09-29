import { getPhrases, getSupportedLocales } from '/lib/xp/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BUNDLES,
  DEFAULT_LOCALE,
  getAllPhrases,
  resolveLocales,
  resolvePhrasesLocale,
} from './i18n';

const getPhrasesMock = vi.mocked(getPhrases);
const getSupportedLocalesMock = vi.mocked(getSupportedLocales);

beforeEach(() => {
  getPhrasesMock.mockReset();
  getSupportedLocalesMock.mockReset();
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

describe('resolvePhrasesLocale', () => {
  it('picks the first requested locale that has a bundle', () => {
    getSupportedLocalesMock.mockReturnValue(['en', 'no']);

    expect(resolvePhrasesLocale(['de', 'no', 'en'])).toBe('no');
    expect(getSupportedLocalesMock).toHaveBeenCalledWith(BUNDLES);
  });

  it('matches a regional locale by its language', () => {
    getSupportedLocalesMock.mockReturnValue(['en', 'pt-BR']);

    expect(resolvePhrasesLocale(['EN-us'])).toBe('en');
    expect(resolvePhrasesLocale(['pt-BR'])).toBe('pt');
  });

  it('falls back to the default locale when no requested locale has a bundle', () => {
    getSupportedLocalesMock.mockReturnValue(['en']);

    expect(resolvePhrasesLocale(['nb-NO'])).toBe(DEFAULT_LOCALE);
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
