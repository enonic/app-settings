import { atom, type ReadableAtom } from 'nanostores';

export type DialogStore<P> = {
  /** What the dialog was opened with, and `undefined` while it is closed. */
  $payload: ReadableAtom<P | undefined>;
  open: (payload: P) => void;
  close: () => void;
};

/**
 * One dialog's open state, held outside the component tree.
 *
 * ! A store rather than component state because of who opens it: a `SectionAction` is an entry in a
 * ! module constant (`ROLE_ACTIONS`), so its `run` has no component to set state on. The payload
 * ! carries what the dialog needs to know — a mode, the items acted on — so the dialog reads one
 * ! value and the opener writes one value.
 *
 * One instance per dialog, created where that dialog's subject lives: a feature slice for a dialog
 * with a form of its own, `pages/<section>/model/` for one a section merely confirms with. Same shape
 * as `createSelectionStore` and `createSearchStore`.
 */
export function createDialogStore<P>(): DialogStore<P> {
  const $payload = atom<P | undefined>(undefined);

  return {
    $payload,

    open(payload) {
      $payload.set(payload);
    },

    close() {
      if ($payload.get() !== undefined) {
        $payload.set(undefined);
      }
    },
  };
}
