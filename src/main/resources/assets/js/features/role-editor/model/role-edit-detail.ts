import { fetchRoleDetail, type RoleDetail } from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<RoleDetail>({ load: fetchRoleDetail });

export const $roleEditDetail = loader.$detail;

export const showRoleForEdit = loader.show;
