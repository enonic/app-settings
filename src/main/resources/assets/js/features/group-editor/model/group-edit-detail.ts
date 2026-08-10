import { fetchGroupDetail, type GroupDetail } from '../../../entities/principal';
import { createDetailLoader } from '../../../shared/detail';

const loader = createDetailLoader<GroupDetail>({ load: fetchGroupDetail });

export const $groupEditDetail = loader.$detail;

export const showGroupForEdit = loader.show;

// ! The cache outlives the dialog, so a group saved and reopened would be seeded from the lists it had
// ! before the save. `forget` rather than `invalidate`: it clears without re-emitting `show`, which
// ! would overwrite what the user has typed.
export const forgetGroupEditDetail = loader.forget;
