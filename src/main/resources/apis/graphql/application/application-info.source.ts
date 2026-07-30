import { listMacros } from '/lib/macro';
import { get } from '/lib/xp/app';
import {
  listComponents,
  listSchemas,
  type ComponentDescriptorType,
  type ContentSchemaType,
} from '/lib/xp/schema';

export type ApplicationInfoSource = {
  key: string;
};

export type ApplicationItem = {
  key: string;
  name: string;
  displayName: string;
  description?: string;
};

export function localNameOf(qualifiedName: string): string {
  const separator = qualifiedName.indexOf(':');
  return separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1);
}

export function listSchemaItems(application: string, type: ContentSchemaType): ApplicationItem[] {
  return listSchemas({ application, type })
    .map((schema) => toApplicationItem(schema.name, schema.title, schema.description))
    .sort(byDisplayName);
}

export function listComponentItems(
  application: string,
  type: ComponentDescriptorType,
): ApplicationItem[] {
  return listComponents({ application, type })
    .map((descriptor) =>
      toApplicationItem(descriptor.key, descriptor.title, descriptor.description),
    )
    .sort(byDisplayName);
}

export function listMacroItems(application: string): ApplicationItem[] {
  return listMacros({ application })
    .map((macro) => toApplicationItem(macro.key, macro.title, macro.description))
    .sort(byDisplayName);
}

export function applicationInfoSource(key: string): ApplicationInfoSource | null {
  return get({ key }) == null ? null : { key };
}

// *
// * Helpers
// *

/**
 * A text field an XP lib declares as `string` but may not send at all.
 *
 * `ScriptMapGenerator.putInMap` drops a key whenever the Java getter returned null, and both
 * `SchemaMapper` and `DescriptorMapper` write `title` and `description` straight from nullable
 * getters. So a descriptor with no title arrives with no `title` property — while
 * `@enonic-types/lib-schema` types it as non-null. Every mapped text field is absent-capable.
 */
type MaybeText = string | undefined;

// ! Keep the null check. The declared type says it cannot be undefined; the runtime disagrees.
function nonEmpty(value: MaybeText): string | undefined {
  return value != null && value.length > 0 ? value : undefined;
}

function toApplicationItem(
  qualifiedName: string,
  title: MaybeText,
  description: MaybeText,
): ApplicationItem {
  const name = localNameOf(qualifiedName);
  return {
    key: qualifiedName,
    name,
    // TODO: [#8] Localize through titleI18nKey once the i18n bundle of the target app is read.
    displayName: nonEmpty(title) ?? name,
    description: nonEmpty(description),
  };
}

function byDisplayName(a: ApplicationItem, b: ApplicationItem): number {
  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
}
