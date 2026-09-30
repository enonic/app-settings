import { getPhrases, getSupportedLocales } from '/lib/xp/i18n';

export const BUNDLES = ['i18n/phrases'];

export const DEFAULT_LOCALE = 'en';

export function resolveLocales(locales: string[] | undefined): string[] {
  return locales !== undefined && locales.length > 0 ? locales : [DEFAULT_LOCALE];
}

/**
 * Mirrors how XP picks the bundle for `getPhrases` (`LocaleServiceImpl.getSupportedLocale`, which
 * runs `Locale.lookup` from RFC 4647), so `lang` names the language the phrases are actually in: a
 * requested tag is truncated (`pt-BR` → `pt`), never widened (`pt` does not match `pt-BR`).
 */
export function resolvePhrasesLocale(locales: string[], bundles: string[] = BUNDLES): string {
  const supported = new Map(getSupportedLocales(bundles).map((tag) => [tag.toLowerCase(), tag]));
  for (const locale of locales) {
    const subtags = locale.toLowerCase().split('-');
    for (let length = subtags.length; length > 0; length--) {
      const match = supported.get(subtags.slice(0, length).join('-'));
      if (match !== undefined) {
        return match;
      }
    }
  }
  return DEFAULT_LOCALE;
}

export function getAllPhrases(
  locales: string[],
  bundles: string[] = BUNDLES,
): Record<string, string> {
  const phrases: Record<string, string> = {};

  bundles.forEach((bundle) => {
    const bundlePhrases = getPhrases(locales, [bundle]);
    Object.keys(bundlePhrases).forEach((key) => {
      phrases[key] = bundlePhrases[key];
    });
  });

  return phrases;
}
