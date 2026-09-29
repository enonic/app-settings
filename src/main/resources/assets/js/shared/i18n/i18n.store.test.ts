import { describe, expect, it } from 'vitest';

import { i18n } from './i18n';
import { $locale, $phrases, setPhrases } from './i18n.store';

describe('i18n', () => {
  it('resolves against the phrases the shell published, at call time', () => {
    setPhrases({ greeting: 'Hei {0}' }, 'no');

    expect(i18n('greeting', 'Bruno')).toBe('Hei Bruno');
  });

  it('marks a key the phrases do not carry', () => {
    setPhrases({}, 'en');

    expect(i18n('nope')).toBe('#nope#');
  });
});

describe('setPhrases', () => {
  it('publishes phrases and locale to the stores', () => {
    setPhrases({ 'nav.users': 'Brukere' }, 'no');

    expect($phrases.get()).toEqual({ 'nav.users': 'Brukere' });
    expect($locale.get()).toBe('no');
  });
});
