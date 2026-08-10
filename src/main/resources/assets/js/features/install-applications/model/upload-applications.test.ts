import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadApplications } from '../../../entities/application';
import { setPhrases } from '../../../shared/i18n';
import { $notifications, clearNotifications } from '../../../shared/notifications';
import { $installDialogOpen, openInstallDialog } from './install-dialog.store';
import { runJarUpload } from './upload-applications';

vi.mock('../../../entities/application', () => ({
  uploadApplications: vi.fn(),
}));

function file(name: string): File {
  return new File(['bytes'], name);
}

function notificationTexts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

beforeEach(() => {
  clearNotifications();
  setPhrases({ 'applications.dialog.install.notJar': '{0} is not a jar file' }, 'en');
  openInstallDialog();
  vi.mocked(uploadApplications).mockReset();
  vi.mocked(uploadApplications).mockResolvedValue(undefined);
});

// Only what gets handed over: order and queue rows are the entity's, tested with
// `uploadApplications`.
describe('runJarUpload', () => {
  it('installs the jar and closes the dialog, so the list behind it shows the upload', async () => {
    const jar = file('booster-3.0.1.jar');

    await runJarUpload([jar]);

    expect(uploadApplications).toHaveBeenCalledWith([jar]);
    expect($installDialogOpen.get()).toBe(false);
  });

  it('hands over the whole pick at once, so every jar shows as queued', async () => {
    const jars = [file('a.jar'), file('b.jar')];

    await runJarUpload(jars);

    expect(uploadApplications).toHaveBeenCalledTimes(1);
    expect(uploadApplications).toHaveBeenCalledWith(jars);
  });

  it('names what was not a jar and installs the rest', async () => {
    const jar = file('booster-3.0.1.jar');

    await runJarUpload([jar, file('notes.txt')]);

    expect(notificationTexts()).toEqual(['notes.txt is not a jar file']);
    expect(uploadApplications).toHaveBeenCalledWith([jar]);
  });

  // Nothing was installed, so the operator is left where they can pick again.
  it('leaves the dialog open when nothing picked was a jar', async () => {
    await runJarUpload([file('notes.txt')]);

    expect(uploadApplications).not.toHaveBeenCalled();
    expect($installDialogOpen.get()).toBe(true);
  });

  it('does nothing at all for an empty pick', async () => {
    await runJarUpload([]);

    expect(notificationTexts()).toEqual([]);
    expect(uploadApplications).not.toHaveBeenCalled();
    expect($installDialogOpen.get()).toBe(true);
  });
});
