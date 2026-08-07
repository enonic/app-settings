import { ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadApplication } from '../../../entities/application';
import { setPhrases } from '../../../shared/i18n';
import { $notifications, clearNotifications } from '../../../shared/notifications';
import { $installDialogOpen, openInstallDialog } from './install-dialog.store';
import { runJarUpload } from './upload-applications';

vi.mock('../../../entities/application', () => ({
  uploadApplication: vi.fn(),
}));

function file(name: string): File {
  return new File(['bytes'], name);
}

const installed = {
  key: 'com.enonic.app.booster',
  version: '3.0.1',
  displayName: 'Booster',
};

function notificationTexts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

beforeEach(() => {
  clearNotifications();
  setPhrases({ 'applications.dialog.install.notJar': '{0} is not a jar file' }, 'en');
  openInstallDialog();
  vi.mocked(uploadApplication).mockReset();
  vi.mocked(uploadApplication).mockResolvedValue(ok(installed));
});

describe('runJarUpload', () => {
  it('installs the jar and closes the dialog, so the list behind it shows the upload', async () => {
    const jar = file('booster-3.0.1.jar');

    await runJarUpload([jar]);

    expect(uploadApplication).toHaveBeenCalledWith(jar);
    expect($installDialogOpen.get()).toBe(false);
  });

  it('uploads one jar at a time rather than all at once', async () => {
    const order: string[] = [];
    vi.mocked(uploadApplication).mockImplementation(async (file) => {
      order.push(`start ${file.name}`);
      await Promise.resolve();
      order.push(`done ${file.name}`);
      return ok(installed);
    });

    await runJarUpload([file('a.jar'), file('b.jar')]);

    expect(order).toEqual(['start a.jar', 'done a.jar', 'start b.jar', 'done b.jar']);
  });

  it('names what was not a jar and installs the rest', async () => {
    const jar = file('booster-3.0.1.jar');

    await runJarUpload([jar, file('notes.txt')]);

    expect(notificationTexts()).toEqual(['notes.txt is not a jar file']);
    expect(uploadApplication).toHaveBeenCalledTimes(1);
    expect(uploadApplication).toHaveBeenCalledWith(jar);
  });

  // Nothing was installed, so the operator is left where they can pick again.
  it('leaves the dialog open when nothing picked was a jar', async () => {
    await runJarUpload([file('notes.txt')]);

    expect(uploadApplication).not.toHaveBeenCalled();
    expect($installDialogOpen.get()).toBe(true);
  });

  it('does nothing at all for an empty pick', async () => {
    await runJarUpload([]);

    expect(notificationTexts()).toEqual([]);
    expect(uploadApplication).not.toHaveBeenCalled();
    expect($installDialogOpen.get()).toBe(true);
  });
});
