import { list, type Project } from '/lib/xp/project';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { displayNameOf, listProjects } from './project.source';

function project(id: string, displayName: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    displayName,
    parents: [],
    publicRead: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('displayNameOf', () => {
  it('reports the display name the project carries', () => {
    expect(displayNameOf(project('intranet', 'Company intranet'))).toBe('Company intranet');
  });

  it('falls back to the id when the display name is empty', () => {
    expect(displayNameOf(project('intranet', ''))).toBe('intranet');
  });

  it('survives a project whose display name the bridge never sent', () => {
    const nameless = { id: 'intranet', parents: [], publicRead: false } as unknown as Project;

    expect(displayNameOf(nameless)).toBe('intranet');
  });
});

describe('listProjects', () => {
  it('sorts by display name, ignoring case', () => {
    vi.mocked(list).mockReturnValue([
      project('c', 'corporate'),
      project('a', 'Archive'),
      project('b', 'blog'),
    ]);

    expect(listProjects().map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps layers alongside projects, since the platform returns them together', () => {
    vi.mocked(list).mockReturnValue([
      project('intranet-no', 'Intranet Norway', { parents: ['intranet'] }),
      project('intranet', 'Intranet'),
    ]);

    expect(listProjects().map(({ id }) => id)).toEqual(['intranet', 'intranet-no']);
  });

  it('answers an empty list when Content Studio ships no projects', () => {
    vi.mocked(list).mockReturnValue([]);

    expect(listProjects()).toEqual([]);
  });
});
