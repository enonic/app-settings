import { fetchUserDetail, type UserDetail } from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<UserDetail>({
  load: (key, signal) => fetchUserDetail(key, false, signal),
});

export const $userEditDetail = loader.$detail;

export const showUserForEdit = loader.show;

export const forgetUserEditDetail = loader.forget;
