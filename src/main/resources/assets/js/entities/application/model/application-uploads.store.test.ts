import { beforeEach, describe, expect, it } from 'vitest';

import {
  $applicationUploads,
  beginUpload,
  endUpload,
  receiveUploadProgress,
} from './application-uploads.store';

beforeEach(() => {
  $applicationUploads.set({});
});

describe('beginUpload', () => {
  it('registers the upload under a fresh id, with nothing sent yet', () => {
    const id = beginUpload('booster.jar');

    expect($applicationUploads.get()[id]).toEqual({ fileName: 'booster.jar' });
  });

  it('keeps two uploads of the same file apart', () => {
    const first = beginUpload('booster.jar');
    const second = beginUpload('booster.jar');

    expect(first).not.toBe(second);
    expect(Object.keys($applicationUploads.get())).toHaveLength(2);
  });
});

describe('receiveUploadProgress', () => {
  it('records progress against the upload without losing its name', () => {
    const id = beginUpload('booster.jar');

    receiveUploadProgress(id, 40);

    expect($applicationUploads.get()[id]).toEqual({ fileName: 'booster.jar', percent: 40 });
  });

  // The last progress event can land after the request has settled and the row is gone.
  it('ignores an upload that has already ended', () => {
    const id = beginUpload('booster.jar');
    endUpload(id);

    receiveUploadProgress(id, 40);

    expect($applicationUploads.get()).toEqual({});
  });
});

describe('endUpload', () => {
  it('drops the one upload and leaves the rest in flight', () => {
    const first = beginUpload('booster.jar');
    const second = beginUpload('fathom.jar');

    endUpload(first);

    expect($applicationUploads.get()).toEqual({ [second]: { fileName: 'fathom.jar' } });
  });
});
