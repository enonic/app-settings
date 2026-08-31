/**
 * ? One id-provider type in a slice named `application`, which reads oddly until you ask who wants
 * ? it: the ID Providers editor, not an Applications screen. The applications domain had two
 * ? consumers and only the first moved to app-applications in Phase 3.3 — this is the remainder,
 * ? left where it was rather than renamed, because Phase 4.3 takes it to app-users and moving it
 * ? twice buys nothing. Its root field is `apis/graphql/application/`, kept for the same reason.
 */

/** An application an id provider can be bound to, i.e. one that ships an id provider descriptor. */
export type IdProviderApplication = {
  key: string;
  displayName: string;
  /** Whether the descriptor declares a config form. Rendering it is #64. */
  hasConfig: boolean;
};
