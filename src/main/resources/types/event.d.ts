/** No `@enonic-types` package exists for lib-event at 8.x — minimal hand-written declaration. */

export interface EnonicEvent<Data extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  timestamp: number;
  localOrigin: boolean;
  distributed: boolean;
  data: Data;
}

export interface ListenerParams {
  /** Event type pattern, e.g. `application` or `node.*`. */
  type?: string;
  localOnly?: boolean;
  callback: (event: EnonicEvent) => void;
}

export function listener(params: ListenerParams): null;
