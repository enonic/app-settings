import { describe, expect, it, vi } from 'vitest';

import type { SectionExtension } from './extension.types';
import { assignSlugs } from './section-slugs';

function row(key: string, path?: string): Omit<SectionExtension, 'slug'> {
  return { key, title: key, url: `/_/admin:extension/${key}`, iconUrl: '/icon', order: 10, path };
}

describe('assignSlugs', () => {
  it('gives a section the path it asked for', () => {
    expect(assignSlugs([row('app:section', 'applications')])[0].slug).toBe('applications');
  });

  it('falls back to the key where the descriptor asked for nothing', () => {
    expect(assignSlugs([row('app:section')])[0].slug).toBe('app:section');
  });

  it('leaves a contested path with the section that comes first', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const slugs = assignSlugs([row('a:one', 'users'), row('b:two', 'users')]);

    expect(slugs.map(({ slug }) => slug)).toEqual(['users', 'b:two']);
    vi.restoreAllMocks();
  });

  it('refuses a path that would reach outside its own route', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(assignSlugs([row('app:section', '../escape')])[0].slug).toBe('app:section');
    vi.restoreAllMocks();
  });
});
