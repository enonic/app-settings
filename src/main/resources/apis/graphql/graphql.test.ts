import { execute } from '/lib/graphql';
import { hasRole } from '/lib/xp/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { post } from './graphql';

describe('post', () => {
  beforeEach(() => {
    vi.mocked(hasRole).mockReturnValue(true);
    vi.mocked(execute).mockReturnValue({ data: { systemVersion: '8.1.0' } });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('answers the execution result for a valid operation', () => {
    const response = post({ body: '{"query":"{ systemVersion }"}' });

    expect(response).toEqual({
      status: 200,
      contentType: 'application/json',
      body: { data: { systemVersion: '8.1.0' } },
    });
  });

  it('forwards variables to the schema', () => {
    post({ body: '{"query":"query Q($k: String){ x(key: $k) }","variables":{"k":"app"}}' });

    expect(vi.mocked(execute).mock.calls[0]?.[2]).toEqual({ k: 'app' });
  });

  it('answers 200 even when the result carries errors, since the client reads the array', () => {
    vi.mocked(execute).mockReturnValue({ errors: [{ message: 'Field undefined' }] });

    const response = post({ body: '{"query":"{ nope }"}' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ errors: [{ message: 'Field undefined' }] });
  });

  it('rejects a missing body without reaching the schema', () => {
    const response = post({});

    expect(response).toEqual({
      status: 400,
      contentType: 'application/json',
      body: { message: 'Request body is missing' },
    });
    expect(vi.mocked(execute)).not.toHaveBeenCalled();
  });

  it('rejects a body that is not valid JSON', () => {
    expect(post({ body: 'not json' }).body).toEqual({
      message: 'Request body is not valid JSON',
    });
  });

  it('rejects a body carrying no query', () => {
    expect(post({ body: '{"variables":{}}' }).body).toEqual({
      message: 'Request body carries no `query` string',
    });
  });

  it('rejects an empty query string', () => {
    expect(post({ body: '{"query":""}' }).body).toEqual({
      message: 'Request body carries no `query` string',
    });
  });

  it('forbids a caller without the admin role', () => {
    vi.mocked(hasRole).mockReturnValue(false);

    const response = post({ body: '{"query":"{ systemVersion }"}' });

    expect(response).toEqual({
      status: 403,
      contentType: 'application/json',
      body: { message: 'Forbidden' },
    });
    expect(vi.mocked(execute)).not.toHaveBeenCalled();
  });
});
