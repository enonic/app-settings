const lastPaths = new Map<string, string>();

/** Where the user was last standing inside a section, so the rail can put them back there. */
export function rememberSubPath(slug: string, subPath: string): void {
  lastPaths.set(slug, subPath);
}

export function lastSubPath(slug: string): string {
  return lastPaths.get(slug) ?? '';
}
