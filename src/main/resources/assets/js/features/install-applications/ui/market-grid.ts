/**
 * The one grid the header, the rows and the skeleton are laid out on. Widths are fixed rather than
 * content-sized: `auto` columns are measured per grid, so every row would find its own widths and the
 * header would stand over none of them. Safe here because the dialog is a fixed `max-w-5xl`.
 *
 * A module of its own, with no imports: the list renders both the header and the rows, so geometry kept
 * beside it would be a cycle back into the list from each of them.
 */
export const MARKET_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)_7.5rem_7rem_7rem] items-center gap-2.5 px-2.5';

/** Wide enough for `6.1.0.SNAPSHOT`, which is what a dev build puts in the installed column. */
export const MARKET_VERSION_CELL_CLASS = 'text-subtle justify-self-end text-sm whitespace-nowrap';

export const MARKET_ACTION_CELL_CLASS = 'flex justify-center';
