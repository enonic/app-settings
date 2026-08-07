import { map } from 'nanostores';

export type ApplicationUpload = {
  /** What the operator picked, and all there is to call it by until core has read the jar. */
  fileName: string;
  /** How much of it has gone out, 0–100. Undefined until the first progress event. */
  percent?: number;
};

/** The jars on their way to the server, by upload id. */
export const $applicationUploads = map<Record<string, ApplicationUpload>>({});

let lastId = 0;

/** Registers an upload and answers the id everything else names it by. */
export function beginUpload(fileName: string): string {
  lastId += 1;
  const id = `upload-${lastId}`;

  $applicationUploads.setKey(id, { fileName });

  return id;
}

/** Records progress, ignoring an upload that has already finished or failed. */
export function receiveUploadProgress(id: string, percent: number): void {
  const upload = $applicationUploads.get()[id];
  if (upload == null) {
    return;
  }

  $applicationUploads.setKey(id, { ...upload, percent });
}

export function endUpload(id: string): void {
  const { [id]: _ended, ...rest } = $applicationUploads.get();
  $applicationUploads.set(rest);
}
