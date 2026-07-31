import type { IdProvider } from '../../../entities/principal';
import {
  type ActionContext,
  actionTargets,
  type SectionAction,
} from '../../../widgets/browse-toolbar/actions';

// TODO: [#4] The provider wizard and the delete dialog arrive with the ID Providers section, which
// needs platform work first: `lib/xp/auth` exposes no update or delete for a provider.
function pending(): void {
  return undefined;
}

const SYSTEM_PROVIDER_KEY = 'system';

/**
 * The provider the installation is built on stays, and a provider with users in it is refused —
 * app-users asks the server the same question through `IdProvider.checkOnDeletable`, which is where
 * this check belongs once there is a server to ask.
 */
function deletable(ctx: ActionContext<IdProvider>): boolean {
  const targets = actionTargets(ctx);
  return (
    targets.length > 0 &&
    targets.every(({ key, users }) => key !== SYSTEM_PROVIDER_KEY && users.length === 0)
  );
}

export const ID_PROVIDER_ACTIONS: readonly SectionAction<IdProvider>[] = [
  {
    id: 'new',
    labelKey: 'idProviders.action.new',
    enabled: () => true,
    run: pending,
  },
  {
    id: 'edit',
    labelKey: 'idProviders.action.edit',
    enabled: (ctx) => actionTargets(ctx).length === 1,
    run: pending,
  },
  {
    id: 'delete',
    labelKey: 'idProviders.action.delete',
    enabled: deletable,
    run: pending,
  },
];
