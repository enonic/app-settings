import { csp, CspSource } from '/lib/xp/portal';

/** Operator levers in `com.enonic.xp.app.settings.cfg`. */
const ENABLED = 'contentSecurityPolicy.enabled';
const EXTRA_HEADER = 'contentSecurityPolicy.header';

/**
 * Seeds the tool page's policy. Everything a section serves is same-origin under this page, so the
 * baseline covers a well-behaved section whole; one needing a remote source extends the same
 * request-scoped policy through XP's `AdminExtensionResponseProcessor`.
 */
export function applyContentSecurityPolicy(): void {
  // ! Off here is off for the chain: a section processor only extends directives already declared.
  if (app.config[ENABLED]?.trim() === 'false') {
    return;
  }

  csp()
    .strict()
    .scriptSrc(CspSource.SELF)
    .styleSrc(CspSource.SELF, CspSource.UNSAFE_INLINE) // the @font-face block in main.html; Preact styles go through CSSOM, ungoverned
    .imgSrc(CspSource.SELF, CspSource.DATA)
    .fontSrc(CspSource.SELF)
    .connectSrc(CspSource.SELF)
    .formAction(CspSource.NONE) // ? the exception: no default-src fallback, so a closed one has to be said
    .merge(app.config[EXTRA_HEADER]?.trim() ?? ''); // ? last and additive: widen without restating
}
