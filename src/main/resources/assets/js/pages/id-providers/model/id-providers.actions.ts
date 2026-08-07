import type { IdProvider } from '../../../entities/principal';
import { openIdProviderCreator, openIdProviderEditor } from '../../../features/idprovider-editor';
import {
  type ActionContext,
  actionTargets,
  type SectionAction,
} from '../../../widgets/browse-toolbar/actions';
import { idProvidersDeletion } from './deletion.store';

const SYSTEM_PROVIDER_KEY = 'system';

/**
 * The provider the installation is built on stays, and a provider with users in it is refused —
 * app-users asks the server the same question through `IdProvider.checkOnDeletable`, which is where
 * this check belongs once there is a server to ask.
 *
 * ! The count decides, never the loaded rows: the list query takes totals without fetching anyone,
 * ! so an empty `items` means nobody asked, not that the provider is empty.
 */
function deletable(ctx: ActionContext<IdProvider>): boolean {
  const targets = actionTargets(ctx);
  return (
    targets.length > 0 &&
    targets.every(({ key, users }) => key !== SYSTEM_PROVIDER_KEY && users.total === 0)
  );
}

export const ID_PROVIDER_ACTIONS: readonly SectionAction<IdProvider>[] = [
  {
    id: 'new',
    labelKey: 'idProviders.action.new',
    enabled: () => true,
    run: openIdProviderCreator,
  },
  {
    id: 'edit',
    labelKey: 'idProviders.action.edit',
    enabled: (ctx) => actionTargets(ctx).length === 1,
    activatedByRow: true,
    run: (ctx) => {
      const [target] = actionTargets(ctx);
      if (target !== undefined) {
        openIdProviderEditor(target);
      }
    },
  },
  {
    id: 'delete',
    labelKey: 'idProviders.action.delete',
    enabled: deletable,
    run: (ctx) => idProvidersDeletion.open(actionTargets(ctx)),
  },
];
