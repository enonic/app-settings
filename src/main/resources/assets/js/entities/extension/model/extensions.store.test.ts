import { err, ok } from 'neverthrow';
import { afterEach, describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/api';
import type { SectionExtension } from './extension.types';
import {
  $sectionExtensions,
  beginSectionExtensionsLoad,
  receiveSectionExtensions,
} from './extensions.store';

const section: SectionExtension = {
  key: 'app:section',
  title: 'Applications',
  url: '/_/admin:extension/app:section',
  iconUrl: '/_/admin:extension?icon&app=app&extension=section',
  order: 10,
};

afterEach(() => {
  $sectionExtensions.set({ status: 'loading', items: [] });
});

describe('beginSectionExtensionsLoad', () => {
  it('reports loading while the rail has nothing to show', () => {
    $sectionExtensions.set({ status: 'ready', items: [] });

    beginSectionExtensionsLoad();

    expect($sectionExtensions.get().status).toBe('loading');
  });

  it('leaves a rail that is already filled alone', () => {
    receiveSectionExtensions(ok([section]));

    beginSectionExtensionsLoad();

    expect($sectionExtensions.get()).toEqual({ status: 'ready', items: [section] });
  });
});

describe('receiveSectionExtensions', () => {
  it('drops the sections it can no longer vouch for on a failure', () => {
    receiveSectionExtensions(ok([section]));

    receiveSectionExtensions(err(new AppError('nope')));

    expect($sectionExtensions.get()).toEqual({ status: 'error', items: [], error: 'nope' });
  });
});
