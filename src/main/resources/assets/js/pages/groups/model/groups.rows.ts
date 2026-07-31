import type { ReactNode } from 'react';

import { type Group, idProviderOf, toPrincipalPath } from '../../../entities/principal';
import type { BrowseRow } from '../../../widgets/browse-list/browse-list';

export function toGroupRow(group: Group, icon?: ReactNode): BrowseRow {
  return {
    key: group.key,
    title: group.displayName,
    subtitle: toPrincipalPath(group.key),
    icon,
    // Provenance, and the last cell by the contract: which provider the group comes from.
    meta: [idProviderOf(group.key)],
  };
}
