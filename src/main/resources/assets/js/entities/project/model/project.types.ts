/**
 * A Content Studio project or layer, reduced to what this app uses it for: naming the roles it owns.
 *
 * Not the platform's `Project` from `@enonic-types/lib-project` — that carries site configs,
 * permissions and language, none of which any section reads, and all of which would then have to
 * cross the wire to satisfy the type.
 */
export type Project = {
  id: string;
  displayName: string;
};
