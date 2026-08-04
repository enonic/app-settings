import { describe, expect, it } from 'vitest';

import type { ApplicationInfo, ApplicationItem } from '../../../entities/application';
import { siteGroups } from './application-site';

function item(name: string): ApplicationItem {
  return { key: `com.enonic.app.booster:${name}`, name, displayName: name };
}

function info(overrides: Partial<ApplicationInfo> = {}): ApplicationInfo {
  return {
    contentTypes: [],
    mixins: [],
    formFragments: [],
    pages: [],
    parts: [],
    layouts: [],
    macros: [],
    tasks: [],
    adminTools: [],
    adminExtensions: [],
    apis: [],
    ...overrides,
  };
}

describe('siteGroups', () => {
  it('lists the six site groups in mockup order', () => {
    const groups = siteGroups(
      info({
        contentTypes: [item('article')],
        mixins: [item('address')],
        formFragments: [item('seo')],
        pages: [item('main')],
        parts: [item('heading')],
        layouts: [item('two-column')],
      }),
    );

    expect(groups.map(({ labelKey }) => labelKey)).toEqual([
      'applications.details.contentTypes',
      'applications.details.pages',
      'applications.details.parts',
      'applications.details.layouts',
      'applications.details.mixins',
      'applications.details.formFragments',
    ]);
  });

  it('drops a group the application contributes nothing to', () => {
    const groups = siteGroups(info({ parts: [item('heading')] }));

    expect(groups).toEqual([{ labelKey: 'applications.details.parts', items: [item('heading')] }]);
  });

  it('sorts a group by the name it renders, not by display name', () => {
    const groups = siteGroups(
      info({ pages: [{ ...item('websocket'), displayName: 'A page' }, item('attachments')] }),
    );

    expect(groups[0]?.items.map(({ name }) => name)).toEqual(['attachments', 'websocket']);
  });

  it('leaves the lists it was given alone', () => {
    const pages = [item('websocket'), item('attachments')];
    siteGroups(info({ pages }));

    expect(pages.map(({ name }) => name)).toEqual(['websocket', 'attachments']);
  });

  it('has no groups without info', () => {
    expect(siteGroups(undefined)).toEqual([]);
  });

  it('has no groups for an application that contributes nothing', () => {
    expect(siteGroups(info())).toEqual([]);
  });
});
