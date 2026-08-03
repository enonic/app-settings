/** A principal reduced to what a member or membership list shows. */
export type PrincipalItem = {
  key: string;
  type: string;
  displayName: string;
};

export function localNameOf(key: string): string {
  return key.slice(key.lastIndexOf(':') + 1);
}

/** Takes an id provider as readily as a principal: both are a key and a display name that may be absent. */
export function displayNameOf(value: { key: string; displayName?: string }): string {
  return nonEmpty(value.displayName) ?? localNameOf(value.key);
}

export function toPrincipalItem(principal: {
  key: string;
  type: string;
  displayName?: string;
}): PrincipalItem {
  return {
    key: principal.key,
    type: principal.type,
    displayName: displayNameOf(principal),
  };
}

export function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

// ! Keep the null check. lib-common's PrincipalMapper writes every text field from a nullable Java
// ! getter, and the bridge drops the key rather than sending null — so a principal with no display
// ! name arrives without the property, whatever the declared type promises.
export function nonEmpty(value?: string): string | undefined {
  return value != null && value.length > 0 ? value : undefined;
}
