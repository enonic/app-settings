import type { Role } from '../../../entities/principal';
import { createDialogStore } from '../../../shared/dialog';

/**
 * The roles a `Delete` is about to apply to, held while the confirmation is open.
 *
 * In the page rather than in a feature slice: the confirmation carries no form and no logic of its
 * own, only this section's wording. The command behind it arrives with the delete mutation.
 *
 * ? Decided rather than drifted into: Groups and Users get their own store and wrapper too, even
 * ? though `deletePrincipals` is one mutation for all three. A shared feature would have to be handed
 * ? the section's phrase keys — a widget may not build a key from a section id — so it would trade
 * ? this file for four props at each call site. Revisit if a fourth section ever needs it.
 */
export const rolesDeletion = createDialogStore<readonly Role[]>();
