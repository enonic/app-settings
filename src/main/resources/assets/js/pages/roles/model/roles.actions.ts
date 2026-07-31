import { isSystemRole, type Role } from '../../../entities/principal';
import {
  type ActionContext,
  actionTargets,
  type SectionAction,
} from '../../../widgets/browse-toolbar/actions';

// TODO: [#5] The role wizard and the delete dialog arrive with the Roles section itself.
function pending(): void {
  return undefined;
}

function deletable(ctx: ActionContext<Role>): boolean {
  const targets = actionTargets(ctx);
  return targets.length > 0 && targets.every(({ key }) => !isSystemRole(key));
}

export const ROLE_ACTIONS: readonly SectionAction<Role>[] = [
  {
    id: 'new',
    labelKey: 'roles.action.new',
    enabled: () => true,
    run: pending,
  },
  {
    id: 'edit',
    labelKey: 'roles.action.edit',
    enabled: (ctx) => actionTargets(ctx).length === 1,
    run: pending,
  },
  {
    id: 'delete',
    labelKey: 'roles.action.delete',
    enabled: deletable,
    run: pending,
  },
];
