import { fetchGroupDetail, type GroupDetail } from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<GroupDetail>({ load: fetchGroupDetail });

export const $groupEditDetail = loader.$detail;

export const showGroupForEdit = loader.show;
