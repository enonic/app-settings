import { isSystemUser, type User } from '../../../entities/principal';
import { actionTargets, type SectionAction } from '../../../widgets/browse-toolbar/actions';

// TODO: [#7] The user wizard, passwords and the delete dialog arrive with the Users section.
function pending(): void {
  return undefined;
}

// ? `su` and `anonymous` belong to the platform — `isSystem()` in lib-admin-ui refuses exactly
// ? those two — so Delete leaves them alone.
export const USER_ACTIONS: readonly SectionAction<User>[] = [
  {
    id: 'new',
    labelKey: 'users.action.new',
    enabled: () => true,
    run: pending,
  },
  {
    id: 'edit',
    labelKey: 'users.action.edit',
    enabled: (ctx) => actionTargets(ctx).length === 1,
    run: pending,
  },
  {
    id: 'delete',
    labelKey: 'users.action.delete',
    enabled: (ctx) => {
      const targets = actionTargets(ctx);
      return targets.length > 0 && targets.every(({ key }) => !isSystemUser(key));
    },
    run: pending,
  },
];
