import { err, errAsync, ok, type Result, type ResultAsync } from 'neverthrow';

// ? Imported from the store file rather than the config barrel: that barrel pulls in config.ts,
// ? which imports this slice, and the cycle would run through `shared/api/index.ts`. config.store.ts
// ? needs only a type from config.ts, so depending on it directly leaves no runtime edge.
import { $config } from '../config/config.store';
import { requestJson } from './client';
import { AppError } from './errors';

export type GraphQlVariables = Record<string, unknown>;

type GraphQlError = { message?: unknown };

type GraphQlBody<T> = {
  data?: T;
  errors?: GraphQlError[];
};

function readErrorMessage(error: GraphQlError | undefined): string {
  const { message } = error ?? {};
  return typeof message === 'string' && message.length > 0 ? message : 'GraphQL request failed';
}

function toData<T>(body: GraphQlBody<T>): Result<T, AppError> {
  // ! A GraphQL response can carry data *and* errors. Reporting a partial result as success would
  // ! hide a failed field behind a half-rendered screen, so any error fails the whole request.
  const [firstError] = body.errors ?? [];
  if (firstError != null) {
    return err(new AppError(readErrorMessage(firstError)));
  }

  if (body.data == null) {
    return err(new AppError('GraphQL response carried neither data nor errors'));
  }

  return ok(body.data);
}

/**
 * Sends one GraphQL operation to the app's own endpoint, whose url comes from the tool config.
 *
 * `operationName` is deliberately not sent: lib-graphql's ExecutionInput ignores it, so a document
 * holding several named operations would silently run the wrong one. One operation per call.
 */
export function requestGraphQl<T>(
  query: string,
  variables?: GraphQlVariables,
  signal?: AbortSignal,
): ResultAsync<T, AppError> {
  const url = $config.get()?.apis.graphql;
  if (url == null) {
    return errAsync(new AppError('Tool config read before the app finished starting'));
  }

  return requestJson<GraphQlBody<T>>(url, {
    method: 'POST',
    body: { query, variables },
    signal,
  }).andThen(toData);
}
