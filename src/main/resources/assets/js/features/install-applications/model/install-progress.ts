import {
  APPLICATION_EVENT,
  PROGRESS_EVENT_TYPE,
  type ServerEvent,
} from '../../../shared/server-events';

export type InstallProgress = {
  url: string;
  percent: number;
};

/** The download progress carried by a server event, where there is any. */
export function toInstallProgress(event: ServerEvent): InstallProgress | undefined {
  if (event.type !== APPLICATION_EVENT || event.data?.eventType !== PROGRESS_EVENT_TYPE) {
    return undefined;
  }

  const { applicationUrl, progress } = event.data;
  if (applicationUrl == null || progress == null) {
    return undefined;
  }

  return { url: applicationUrl, percent: progress };
}
