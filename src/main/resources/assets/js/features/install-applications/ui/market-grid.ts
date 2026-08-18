/**
 * The one grid the header, the rows and the skeleton are laid out on. Widths are fixed rather than
 * content-sized: `auto` columns are measured per grid, so every row would find its own widths and the
 * header would stand over none of them. Safe here because the dialog is a fixed `max-w-5xl`.
 *
 * The version tracks hold `6.1.0-SNAPSHOT`, which is what a dev build puts in the installed column. A
 * qualifier has no length limit, so anything longer clips — see `MARKET_VERSION_CELL_CLASS`.
 */
export const MARKET_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)_8rem_7.5rem_7rem] items-center gap-2.5 px-2.5';

export const MARKET_VERSION_CELL_CLASS = 'text-subtle justify-self-end truncate p-1 text-sm';

export const MARKET_ACTION_CELL_CLASS = 'flex justify-center';
