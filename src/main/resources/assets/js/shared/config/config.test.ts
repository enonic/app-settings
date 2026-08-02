import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AppError } from '../api';
import { readConfig, type ToolConfig } from './config';

const config: ToolConfig = {
  appId: 'com.enonic.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  menuLoaderUrl: '/_/admin:extension/com.enonic.xp.app.main:menu-loader',
  phrases: { 'nav.users': 'Users' },
  apis: { events: '/_/app:events', graphql: '/_/app:graphql' },
};

type StubOptions = {
  scriptId?: string | null;
  islandId?: string;
  content?: string | null;
};

const CONFIG_ATTRIBUTE = 'data-config-script-id';

// Honours the selector and the attribute name, so renaming either in config.ts or in
// main.html fails these tests instead of only failing at boot.
function stubDocument({ scriptId, islandId, content }: StubOptions): Document {
  const islandName = scriptId ?? 'config-json';

  return {
    querySelector: (selector: string) =>
      selector === `script[${CONFIG_ATTRIBUTE}]` && scriptId !== null
        ? { getAttribute: (name: string) => (name === CONFIG_ATTRIBUTE ? islandName : null) }
        : null,
    getElementById: (id: string) =>
      id === (islandId ?? islandName) ? { textContent: content ?? null } : null,
  } as unknown as Document;
}

describe('readConfig', () => {
  it('reads the config from the island named by the loader script', () => {
    const doc = stubDocument({ scriptId: 'config-json', content: JSON.stringify(config) });

    expect(readConfig(doc)).toEqual(config);
  });

  it('reads the attribute main.html actually sets on the loader script', () => {
    const template = readFileSync(
      join(import.meta.dirname, '../../../../admin/tools/main/main.html'),
      'utf8',
    );

    expect(template).toContain(`${CONFIG_ATTRIBUTE}="{{configScriptId}}"`);
    expect(template).toContain('id="{{configScriptId}}"');
  });

  it('fails when no script carries the attribute', () => {
    const doc = stubDocument({ scriptId: null });

    expect(() => readConfig(doc)).toThrow(AppError);
    expect(() => readConfig(doc)).toThrow(/data-config-script-id/);
  });

  it('fails when the island is missing', () => {
    const doc = stubDocument({ scriptId: 'config-json', islandId: 'other', content: '{}' });

    expect(() => readConfig(doc)).toThrow(/missing or empty/);
  });

  it('fails when the island is empty', () => {
    const doc = stubDocument({ scriptId: 'config-json', content: '' });

    expect(() => readConfig(doc)).toThrow(/missing or empty/);
  });

  it('fails on invalid JSON', () => {
    const doc = stubDocument({ scriptId: 'config-json', content: '{not json' });

    expect(() => readConfig(doc)).toThrow(/not valid JSON/);
  });

  it('fails when required fields are absent', () => {
    const doc = stubDocument({
      scriptId: 'config-json',
      content: JSON.stringify({ appId: 'x', apis: {} }),
    });

    expect(() => readConfig(doc)).toThrow(/does not describe a tool config/);
  });

  it('still starts the app when the menu loader url is absent', () => {
    const { menuLoaderUrl: _, ...withoutMenu } = config;
    const doc = stubDocument({ scriptId: 'config-json', content: JSON.stringify(withoutMenu) });

    expect(readConfig(doc)).toEqual(withoutMenu);
  });

  it('fails when phrases are missing', () => {
    const doc = stubDocument({
      scriptId: 'config-json',
      content: JSON.stringify({ ...config, phrases: undefined }),
    });

    expect(() => readConfig(doc)).toThrow(/does not describe a tool config/);
  });

  // Every api url is required: an absent one only surfaces as a failed request much later.
  it('fails when an api url is missing', () => {
    const doc = stubDocument({
      scriptId: 'config-json',
      content: JSON.stringify({ ...config, apis: { events: '/_/app:events' } }),
    });

    expect(() => readConfig(doc)).toThrow(/does not describe a tool config/);
  });
});
