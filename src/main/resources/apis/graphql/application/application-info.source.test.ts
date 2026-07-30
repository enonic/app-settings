import { listMacros, type MacroDescriptor } from '/lib/macro';
import { listTaskDescriptors, type TaskDescriptor } from '/lib/task';
import { get } from '/lib/xp/app';
import { listComponents, listSchemas } from '/lib/xp/schema';
import type { ContentTypeSchema, PartDescriptor } from '@enonic-types/lib-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applicationInfoSource,
  listComponentItems,
  listMacroItems,
  listSchemaItems,
  listTaskItems,
  localNameOf,
} from './application-info.source';

function contentType(name: string, title = '', description = ''): ContentTypeSchema {
  return {
    name,
    title,
    titleI18nKey: '',
    description,
    descriptionI18nKey: '',
    createdTime: '2026-07-30T10:00:00Z',
    creator: 'user:system:su',
    modifiedTime: '2026-07-30T10:00:00Z',
    modifier: 'user:system:su',
    resource: '',
    type: 'CONTENT_TYPE',
    form: [],
    config: {},
  };
}

function part(key: string, title = '', description = ''): PartDescriptor {
  return {
    key,
    title,
    titleI18nKey: '',
    description,
    descriptionI18nKey: '',
    componentPath: '',
    modifiedTime: '2026-07-30T10:00:00Z',
    resource: '',
    type: 'PART',
    form: [],
    config: {},
  };
}

function macro(key: string, title = '', description = ''): MacroDescriptor {
  return { key, title, description };
}

function task(key: string, description?: string): TaskDescriptor {
  return { key, description };
}

// XP's script mapper omits a key entirely when the Java getter returned null, so a descriptor with
// no title reaches JS without a `title` property at all. The declared types do not say so.
function withoutText<T extends { title: string; description: string }>(schema: T): T {
  const { title: _title, description: _description, ...rest } = schema;
  return rest as T;
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('localNameOf', () => {
  it('drops the application prefix', () => {
    expect(localNameOf('com.enonic.app.foo:article')).toBe('article');
  });

  it('returns an unqualified name unchanged', () => {
    expect(localNameOf('article')).toBe('article');
  });

  it('splits on the first colon only, so a name may contain one', () => {
    expect(localNameOf('com.enonic.app.foo:a:b')).toBe('a:b');
  });
});

describe('listSchemaItems', () => {
  it('reports the qualified key alongside the local name', () => {
    vi.mocked(listSchemas).mockReturnValue([contentType('com.example.app:article', 'Article')]);

    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')).toEqual([
      {
        key: 'com.example.app:article',
        name: 'article',
        displayName: 'Article',
        description: undefined,
      },
    ]);
  });

  it('falls back to the local name when the schema has no title', () => {
    vi.mocked(listSchemas).mockReturnValue([contentType('com.example.app:untitled')]);

    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')[0]?.displayName).toBe('untitled');
  });

  it('reports an empty description as absent', () => {
    vi.mocked(listSchemas).mockReturnValue([contentType('com.example.app:a', 'A', '')]);

    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')[0]?.description).toBeUndefined();
  });

  it('survives a schema whose title and description keys were never sent', () => {
    vi.mocked(listSchemas).mockReturnValue([withoutText(contentType('com.example.app:bare'))]);

    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')).toEqual([
      {
        key: 'com.example.app:bare',
        name: 'bare',
        displayName: 'bare',
        description: undefined,
      },
    ]);
  });

  it('sorts by display name, ignoring case', () => {
    vi.mocked(listSchemas).mockReturnValue([
      contentType('com.example.app:c', 'zeta'),
      contentType('com.example.app:a', 'Alpha'),
      contentType('com.example.app:b', 'Beta'),
    ]);

    expect(
      listSchemaItems('com.example.app', 'CONTENT_TYPE').map((item) => item.displayName),
    ).toEqual(['Alpha', 'Beta', 'zeta']);
  });

  it('reads the schema type it was asked for', () => {
    vi.mocked(listSchemas).mockImplementation(({ type }) =>
      type === 'MIXIN' ? [contentType('com.example.app:meta', 'Meta')] : [],
    );

    expect(listSchemaItems('com.example.app', 'MIXIN').map((item) => item.name)).toEqual(['meta']);
    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')).toEqual([]);
  });

  it('answers an empty list for an application shipping no schemas', () => {
    vi.mocked(listSchemas).mockReturnValue([]);

    expect(listSchemaItems('com.example.app', 'CONTENT_TYPE')).toEqual([]);
  });
});

describe('listComponentItems', () => {
  it('reads the descriptor key rather than a name field', () => {
    vi.mocked(listComponents).mockReturnValue([part('com.example.app:hero', 'Hero')]);

    expect(listComponentItems('com.example.app', 'PART')).toEqual([
      { key: 'com.example.app:hero', name: 'hero', displayName: 'Hero', description: undefined },
    ]);
  });

  it('survives a descriptor whose title and description keys were never sent', () => {
    vi.mocked(listComponents).mockReturnValue([withoutText(part('com.example.app:bare'))]);

    expect(listComponentItems('com.example.app', 'PART')[0]?.displayName).toBe('bare');
  });

  it('reads the component type it was asked for', () => {
    vi.mocked(listComponents).mockImplementation(({ type }) =>
      type === 'LAYOUT' ? [part('com.example.app:two-column', 'Two column')] : [],
    );

    expect(listComponentItems('com.example.app', 'LAYOUT').map((item) => item.name)).toEqual([
      'two-column',
    ]);
    expect(listComponentItems('com.example.app', 'PART')).toEqual([]);
  });
});

describe('listMacroItems', () => {
  it('splits the qualified macro key into a local name, and reports no description', () => {
    vi.mocked(listMacros).mockReturnValue([macro('com.example.app:quote', 'Quote')]);

    expect(listMacroItems('com.example.app')).toEqual([
      { key: 'com.example.app:quote', name: 'quote', displayName: 'Quote', description: undefined },
    ]);
  });

  // Java's MacroDescriptor substitutes the name for a missing title, so `title` is the one mapped
  // text field that always arrives. It can still arrive empty.
  it('falls back to the local name when the title is empty', () => {
    vi.mocked(listMacros).mockReturnValue([macro('com.example.app:untitled', '')]);

    expect(listMacroItems('com.example.app')[0]?.displayName).toBe('untitled');
  });

  it('sorts by display name, ignoring case', () => {
    vi.mocked(listMacros).mockReturnValue([
      macro('com.example.app:c', 'zeta'),
      macro('com.example.app:a', 'Alpha'),
      macro('com.example.app:b', 'Beta'),
    ]);

    expect(listMacroItems('com.example.app').map((item) => item.displayName)).toEqual([
      'Alpha',
      'Beta',
      'zeta',
    ]);
  });

  it('answers an empty list for an application shipping no macros', () => {
    vi.mocked(listMacros).mockReturnValue([]);

    expect(listMacroItems('com.example.app')).toEqual([]);
  });
});

describe('listTaskItems', () => {
  // The one list whose displayName carries no extra information: TaskDescriptor has no title.
  it('reports the local name as the display name', () => {
    vi.mocked(listTaskDescriptors).mockReturnValue([
      task('com.example.app:reindex', 'Rebuilds the index'),
    ]);

    expect(listTaskItems('com.example.app')).toEqual([
      {
        key: 'com.example.app:reindex',
        name: 'reindex',
        displayName: 'reindex',
        description: 'Rebuilds the index',
      },
    ]);
  });

  it('reports a description the bridge never sent as absent', () => {
    vi.mocked(listTaskDescriptors).mockReturnValue([task('com.example.app:bare')]);

    expect(listTaskItems('com.example.app')[0]?.description).toBeUndefined();
  });

  it('sorts by name, which app-applications leaves in locator order', () => {
    vi.mocked(listTaskDescriptors).mockReturnValue([
      task('com.example.app:zip'),
      task('com.example.app:Archive'),
      task('com.example.app:build'),
    ]);

    expect(listTaskItems('com.example.app').map((item) => item.name)).toEqual([
      'Archive',
      'build',
      'zip',
    ]);
  });

  it('answers an empty list for an application declaring no tasks', () => {
    vi.mocked(listTaskDescriptors).mockReturnValue([]);

    expect(listTaskItems('com.example.app')).toEqual([]);
  });
});

describe('applicationInfoSource', () => {
  it('carries only the key, so each leaf resolves its own call', () => {
    vi.mocked(get).mockReturnValue({
      key: 'com.example.app',
      version: '1.0.0',
      systemVersion: '8.1.0',
      minSystemVersion: null,
      maxSystemVersion: null,
      modifiedTime: null,
      started: true,
      system: false,
    });

    expect(applicationInfoSource('com.example.app')).toEqual({ key: 'com.example.app' });
  });

  // Without this an unknown key answers with empty lists, indistinguishable from an installed
  // application that ships no CMS content.
  it('answers null for an application that is not installed', () => {
    vi.mocked(get).mockReturnValue(null);

    expect(applicationInfoSource('com.example.missing')).toBeNull();
  });
});
