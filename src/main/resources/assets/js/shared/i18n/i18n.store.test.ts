import { describe, expect, it } from 'vitest';

import { $locale, $phrases, localize, setPhrases } from './i18n.store';

describe('localize', () => {
  const phrases = {
    plain: 'Users',
    single: 'Id: {0}',
    multiple: '{0} of {1}',
    repeated: '{0} and {0}',
  };

  it('returns the phrase as-is when it has no placeholders', () => {
    expect(localize(phrases, 'plain')).toBe('Users');
  });

  it('marks a missing key so it is visible in the UI', () => {
    expect(localize(phrases, 'nope')).toBe('#nope#');
  });

  it('substitutes positional placeholders', () => {
    expect(localize(phrases, 'single', 'abc')).toBe('Id: abc');
    expect(localize(phrases, 'multiple', 3, 7)).toBe('3 of 7');
    expect(localize(phrases, 'repeated', 'x')).toBe('x and x');
  });

  it('leaves a placeholder untouched when no value was supplied', () => {
    expect(localize(phrases, 'multiple', 'only')).toBe('only of {1}');
  });
});

describe('setPhrases', () => {
  it('publishes phrases and locale to the stores', () => {
    setPhrases({ 'nav.users': 'Brukere' }, 'no');

    expect($phrases.get()).toEqual({ 'nav.users': 'Brukere' });
    expect($locale.get()).toBe('no');
  });
});
