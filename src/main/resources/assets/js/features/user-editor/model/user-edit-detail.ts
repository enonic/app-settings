import { fetchUserDetail, type UserDetail } from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<UserDetail>({ load: fetchUserDetail });

export const $userEditDetail = loader.$detail;

export const showUserForEdit = loader.show;
