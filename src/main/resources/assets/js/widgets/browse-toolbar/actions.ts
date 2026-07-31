export type ActionContext<T> = {
  selected: readonly T[];
  active: T | undefined;
};

export type SectionAction<T> = {
  id: string;
  labelKey: string;
  /** Pure — no I/O, no store reads. Unit-tested per section. */
  enabled: (ctx: ActionContext<T>) => boolean;
  run: (ctx: ActionContext<T>) => void | Promise<void>;
};

/**
 * What an action applies to: the ticked rows, or the active row when nothing is ticked.
 * Content Studio calls the same thing its current items, and the toolbar and the row context
 * menu both read it, so right-clicking a row is enough to act on it.
 */
export function actionTargets<T>({ selected, active }: ActionContext<T>): readonly T[] {
  if (selected.length > 0) {
    return selected;
  }

  return active === undefined ? [] : [active];
}
