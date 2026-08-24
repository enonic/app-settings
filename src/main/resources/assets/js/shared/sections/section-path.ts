/**
 * The shell's path and a section's own sub-path, in both directions. The sub-path is the guest's
 * opaque string: only its segments are routed, and its search params travel through untouched.
 */

/** Everything after the section's slug, search params included. */
export function readSubPath(pathname: string, searchStr: string, slug: string): string {
  const prefix = `/${slug}`;
  const inSection = pathname === prefix || pathname.startsWith(`${prefix}/`);

  return `${inSection ? pathname.slice(prefix.length) : ''}${searchStr}`;
}

/** The shell path a section's sub-path resolves to. */
export function sectionPath(slug: string, subPath: string): string {
  const [rawPath = '', ...rest] = escapeHash(subPath).split('?');

  const segments = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');
  const search = rest.length === 0 ? '' : `?${rest.join('?')}`;

  return `/${slug}${segments === '' ? '' : `/${segments}`}${search}`;
}

//
// * Internal
//

/** ! Under hash history a `#` would end the url, taking the search params with it. */
function escapeHash(subPath: string): string {
  return subPath.replace(/#/g, '%23');
}
