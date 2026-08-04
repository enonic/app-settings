import {
  type Application,
  startApplications,
  stopApplications,
} from '../../../entities/application';
import {
  type ActionContext,
  actionTargets,
  type SectionAction,
} from '../../../widgets/browse-toolbar/actions';
import { isStartable, isStoppable } from './application-lifecycle';

/**
 * ! Install and Uninstall are in the mockup toolbar and belong to #3, so they stay visible and
 * ! disabled: a button that is enabled and does nothing reads as a broken tool.
 *
 * TODO: [#3] Install by url and upload, and Uninstall — which must exclude a locally deployed
 * TODO: application as well as a platform one, and needs `local` added to the schema for that.
 */
const PENDING = {
  enabled: (): boolean => false,
  run: (): void => undefined,
};

/**
 * The targets an action applies to, out of everything it was pointed at. A mixed selection is not
 * refused: Start starts the stopped ones, as app-applications does, and leaves the rest alone.
 */
function startTargets(ctx: ActionContext<Application>): readonly Application[] {
  return actionTargets(ctx).filter(isStartable);
}

function stopTargets(ctx: ActionContext<Application>): readonly Application[] {
  return actionTargets(ctx).filter(isStoppable);
}

export const APPLICATION_ACTIONS: readonly SectionAction<Application>[] = [
  {
    id: 'install',
    labelKey: 'applications.action.install',
    ...PENDING,
  },
  {
    id: 'uninstall',
    labelKey: 'applications.action.uninstall',
    ...PENDING,
  },
  {
    id: 'start',
    labelKey: 'applications.action.start',
    enabled: (ctx) => startTargets(ctx).length > 0,
    run: (ctx) => startApplications(startTargets(ctx)),
  },
  {
    id: 'stop',
    labelKey: 'applications.action.stop',
    enabled: (ctx) => stopTargets(ctx).length > 0,
    run: (ctx) => stopApplications(stopTargets(ctx)),
  },
];
