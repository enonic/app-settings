import {
  fetchIdProviderPermissions,
  type IdProviderPermissions,
} from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<IdProviderPermissions>({ load: fetchIdProviderPermissions });

export const $idProviderEditDetail = loader.$detail;

export const showIdProviderForEdit = loader.show;
