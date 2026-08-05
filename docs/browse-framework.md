# Browse framework contract

Every section of this app — Applications, Users, Groups, Roles, ID Providers — is the same screen
with different data. This document is the contract for that screen: what the shared widgets are,
what they accept, and where the boundary between shared and section-specific code runs.

**Status: implemented as the day-0 skeleton (#17).** Every signature below exists in `widgets/`, and all
five sections are wired to it on live data through the GraphQL layer. No mutation is wired anywhere yet. Sections are built against
these signatures, so that one list, toolbar and details panel serve every section instead of being
written once per section. The current five are not the final set — further admin applications are expected to move
into this app, so nothing here may enumerate sections or assume how many there are.

Deferred and additive, not part of day 0: toolbar overflow row and split buttons, list virtualization,
details-panel tabs, expandable nested rows for Groups.

## 1. Anatomy

Identical across the Applications, Users, Groups and ID Providers mockups. The action toolbar spans
the full width; the two columns start below it. The search field belongs to the list column only.

```
┌────┬──────────────────────────────────────────────────────────────────────┐
│    │ Applications                                              A   (XP)  │  AppBar        (exists)
│    ├──────────────────────────────────────────────────────────────────────┤
│ S  │  Install   Uninstall   Start   Stop   ·Option 5·   ·Option 6·        │  browse-toolbar
│ e  ├───────────────────────────────────────────┬──────────────────────────┤
│ c  │  ⌕ Type to search                         │  ▣  Booster    (Started ▾)│  browse-search
│ t  ├───────────────────────────────────────────┤     description text     │  details-panel
│ i  │  ☐ Select all     ⟳ Refresh  ⑃ Filter  ⇅ Sort                        │  browse-list-header
│ o  ├───────────────────────────────────────────┤  APPLICATION ───────────  │  details section
│ n  │  ☑ ▣ Booster            1.2.0 / 1.4.0  started                       │  browse-list rows
│    │  ☐ ▣ Fathom             2.1.0 / 3.0.1  started                       │
│ r  │  ☐ ▣ Application name   2.1.0 / 3.0.1  started                       │  TASKS ─────────────
│ a  │                                           │  Key                     │  details field
│ i  │                                           │  com.enonic.app.booster  │
│ l  │                                           │  ...                     │
└────┴───────────────────────────────────────────┴──────────────────────────┘
```

Per-section differences are **data only**:

|                       | Applications                            | Users                                       | Groups                                                                | ID Providers                                             |
| --------------------- | --------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Toolbar actions       | Install / Uninstall / Start / Stop      | New user / Edit / Delete                    | New group / Edit / Delete                                             | New provider / Edit / Delete                             |
| Row subtitle          | description                             | user name                                   | group name                                                            | provider key                                             |
| Row meta cells        | installed + available version, state    | ID provider                                 | ID provider                                                           | bound application                                        |
| Details header action | state dropdown                          | —                                           | —                                                                     | —                                                        |
| Details sections      | Application, Tasks, Admin extensions, … | User (+ Edit button), Roles (7), Groups (5) | Info (+ Edit button), Members (8) → Users (6) / Groups (2), Roles (3) | Info (+ Edit button), Users (124), Groups (8), Roles (4) |

That table is the whole justification for the framework: same widgets, different props.

Roles is deliberately absent from the table: it is the day-0 consumer of the framework and ships with
the plainest possible mapping — title, the role key as its subtitle, no meta cells,
`New role / Edit / Delete` — so that nothing section-specific hides a gap in the shared widgets.

Under a display name goes the principal's own **name** — `alice`, `administrators`, `cms.admin` —
never the `role:system.admin` wire form and never a path: `principalName()` in `entities/principal`
takes what the key ends with, and a user's `login` is the same string. The provider it belongs to is
provenance and goes in the meta cell, so it is never repeated under the name. Rows and the details
header agree on this.

For rows that represent a real domain object, the **last meta cell is provenance**: which ID provider
a user or group comes from, which application backs an ID provider, which state an application is in.
Transient rows are exempt (§ 3.3). Cells left of it are section-specific, and a value that is absent
means no cell rather than an empty one — `meta` is a list of cells. The `Info` / `More info` cells the
Users and Groups mockups show are not defined yet, and neither is `Active` / `Inactive` on an ID
provider (§ 5); `meta` is an array, so both slot in later without a contract change.

A details panel may hold more lists than the mockups draw where the data is already there: a group
shows the roles it holds, an ID provider the users, groups and roles of its principals. A section with
nothing in it is not rendered at all (§ 3.4).

There is no ID-provider tree anywhere: providers are their own flat section. A consequence for the
Users and Groups wizards — the provider a principal is created in has to be picked explicitly in the
wizard, since there is no tree node to create it under.

## 2. What lives where

| Layer                | Contains                                                                  | Must not                                                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `widgets/`           | the framework below — section-agnostic                                    | import from `entities/` or `pages/`; know any domain word |
| `pages/<section>/`   | composition, entity → row/field mapping, routing glue                     | hold reusable logic                                       |
| `features/<action>/` | one user action: dialog, wizard, command                                  | any import to or from `widgets/`                          |
| `entities/<domain>/` | types, the only I/O, stores                                               | import from `widgets/`, `features/`, `pages/`             |
| `shared/`            | api client, config, i18n, server events, selection, detail, format, `ui/` | import from any layer above                               |

`.claude/rules/structure.md` is the same table with the reasoning; a component both a widget and a
feature need goes to `shared/ui/`, since neither layer may import the other.

The rule that makes parallel work possible: **the list and the details panel never know what a user
or an application is.** Sections map their domain objects into the view models below.

## 3. Widget contracts

Signatures are the contract; implementations start dumb and grow additively.

```
widgets/browse-screen/BrowseScreen.tsx      the whole screen a section renders
widgets/browse-screen/useBrowseSection.ts   rows, action context and handlers from a section's data
widgets/browse-layout/BrowseLayout.tsx      the columns: toolbar, list column, details column
widgets/browse-layout/browse-layout.ts      column minimums, clampDetailsWidth, the stored width
widgets/browse-layout/useActiveKey.ts       the item route's $id, for `activeKey`
widgets/browse-toolbar/actions.ts           SectionAction<T>, LabelledAction<T>, ActionContext<T>
widgets/browse-toolbar/BrowseToolbar.tsx    the full-width action toolbar
widgets/browse-list/browse-list.ts          BrowseRow and the pure list logic: selectableKeys,
                                            selectAllState, toggledSelection, contextMenuTarget,
                                            tabbableRowKey, nextRowKey
widgets/browse-list/BrowseList.tsx          rows, roving focus, skeleton, empty and error states
widgets/browse-list/BrowseListRow.tsx       one row: checkbox, label, meta cells
widgets/browse-list/BrowseListHeader.tsx    select all, refresh, filter and sort slots
widgets/browse-list/header-controls.ts      the classes those three controls share, labels included
widgets/browse-list/InertHeaderControl.tsx  the greyed stand-in for a control a section has not supplied
widgets/browse-list/BrowseListContextMenu.tsx  the action list on right-click
widgets/item-label/ItemLabel.tsx            icon + title + subtitle, shared with the details panel
widgets/browse-search/BrowseSearch.tsx      the composed SearchField
widgets/details-panel/DetailsPanel.tsx      Empty / Header / Section / Subsection / Field / List
widgets/details-panel/details-panel.ts      withCount, filledSections, detailsEmptyLabelKey
widgets/details-panel/DetailsEmpty.tsx      the column with nothing to show
widgets/dialog/ConfirmDialog.tsx            asks before a destructive action — not part of the browse
                                            screen, but section-agnostic and used from features/
shared/selection                            createSelectionStore<K>()
shared/search                               createSearchStore()
shared/detail                               createDetailLoader<T>() — the details panel's keyed load
shared/format                               formatDate, formatDateTime, formatBytes, getInitials
```

**A section composes `BrowseScreen`, not the widgets one by one.** The first two sections came out
identical below their props — same toolbar, search, header, list, context menu and details column,
wired the same way — so the wiring lives in `BrowseScreen` and `useBrowseSection`, and a page states
only what is its own: its items and status, its `visible` rows, its `toRow`, its actions, its stores, and how
to navigate to an item. That is about forty lines per section. The widgets below stay usable on their
own for a screen that is not a browse screen.

Navigation stays in the page on purpose: the router types a route's params against its own literal
path, so no widget can navigate to `/{section}/$id` generically. `openItem` and `closeItem` are the
two lines a section writes, both with `replace: true`.

There is no DOM test environment in this project, so a widget's logic goes in a pure helper beside the
component — row mapping, `enabled` predicates, select-all state, overflow computation — and the
component keeps only composition. That is what makes the framework testable at all.

### 3.1 Layout

```ts
// widgets/browse-layout
export type BrowseLayoutProps = {
  toolbar: ReactNode;
  list: ReactNode;
  /** The details column, always on screen; empty until an item route is matched. */
  details?: ReactNode;
};
```

**The details column is always there.** Its content is route-driven — `BrowseLayout` renders `details`
while a child (item) route is matched and `DetailsEmpty` otherwise — but the column itself does not
come and go, so the list never jumps sideways on a click. A page passes `details={<Outlet />}`
unconditionally.

An item page renders that same `DetailsEmpty` when its id resolves to nothing — but not with the same
phrase every time. **Loading, failed and gone are three states, and conflating any pair of them lies to
the reader:** a section that has not loaded yet says `browse.details.loading`, one whose load failed
says `<section>.details.failed`, an id nothing answers to says the item is gone, and only the absence of
an item route reads as `browse.details.empty`. What the column must never do is render nothing, leaving
it blank while the url claims a selection.

A parent route component cannot read a child route's params without `from:`, so the check is
`useChildMatches()`, not `useParams`. That is also what `useActiveKey()` beside the layout does: it
returns the item route's `$id` for the page to pass as `activeKey`, and `undefined` while no item route
is matched.

**The columns are a split view, dragged by a handle between them.** `@enonic/ui` has no `SplitView` in
any version, and Content Studio's is a wrapper around `react-resizable-panels`, which is a dependency
of its own — so this is 40 lines of pointer handling over flexbox, with Studio's handle styling
(`w-1.25 bg-bdr-soft`, `hover:bg-bdr-select`) and its `300px` minimum per column. The list column
flexes, the details column carries the dragged pixel width, `browse-layout.ts` holds the pure
`clampDetailsWidth` plus the `localStorage` read and write, and the handle is a keyboard `separator`:
`ArrowLeft` and `ArrowRight` move it in 16px steps. If the shared library ever grows a split view,
swapping it in must not change these props.

### 3.2 Toolbar and actions

```ts
// widgets/browse-toolbar/actions.ts
export type ActionContext<T> = {
  selected: readonly T[];
  active: T | undefined;
};

/** Ticked rows, or the active row when none are ticked. */
export function actionTargets<T>(ctx: ActionContext<T>): readonly T[];

/** What a section declares: a key, because the list is a module constant. */
export type SectionAction<T> = {
  id: string;
  labelKey: string;
  /** Pure — no I/O, no store reads. Unit-tested per section. */
  enabled: (ctx: ActionContext<T>) => boolean;
  run: (ctx: ActionContext<T>) => void | Promise<void>;
};

/** What renders: `BrowseScreen` resolves the labels once with `useLabelled` and hands these down. */
export type LabelledAction<T> = SectionAction<T> & { label: string };

export type BrowseToolbarProps<T> = {
  actions: readonly LabelledAction<T>[];
  context: ActionContext<T>;
};

// widgets/browse-list/BrowseListContextMenu.tsx — the same list, on right-click
export type BrowseListContextMenuProps<T> = {
  actions: readonly LabelledAction<T>[];
  context: ActionContext<T>;
  children: ReactNode;
};
```

Rules:

- The toolbar renders text buttons in the given order and derives `disabled` from `enabled(ctx)`.
  A disabled action stays visible and greyed — the mockups show `Option 5` / `Slett` that way.
- A refusal is expressed **inside `enabled`**, never re-checked in `run`, and it names the rule it
  comes from — `isReservedRole` for Delete, not a global flag (§ 3.5).
- `run` calls a command from `entities/` or opens a `features/` dialog. No fetch in the widget.
- **An action that needs confirming opens the dialog through a store, not through component state.**
  The action list is a module constant, so `run` cannot reach a `useState` in the page: the feature slice
  owns an atom holding what the dialog is asking about, the page mounts the component, and the component
  renders nothing while that atom is empty. `features/uninstall-applications/` is the worked example, and
  `widgets/dialog/ConfirmDialog.tsx` is the shell it composes — the copy and what confirming does stay in
  the feature.
- **An action targets `actionTargets(ctx)`, not `ctx.selected`.** With rows ticked it is the ticked
  set; with none, the active row — Content Studio's "current items". So highlighting a row, or
  right-clicking one, is enough to act on it, and the toolbar and the row menu agree by construction.
- **The row context menu is the toolbar's action list, rendered on right-click.** The page wraps the
  list in `BrowseListContextMenu` and hands it the same `actions` and `context`; the widget never gets
  a list of its own. Right-clicking a row that is not ticked drops the ticks and makes that row active
  first (`contextMenuTarget` decides, § 3.3), so the menu acts on what was clicked; right-clicking one
  of several ticked rows keeps the whole set.
- Overflow row and split buttons come later, reusing the same `SectionAction` list. Do not fork the
  type for them. This row keeps its fixed `h-15` and does not wrap: a `SectionAction` carries a
  `labelKey` and no icon, so it cannot degrade to icons the way the list header does (§ 3.6). Content
  Studio's `OverflowActionRow` is the shape the eventual fix will take.

### 3.3 List

```ts
// widgets/browse-list
export type BrowseRow = {
  /** Stable id: selection key and `/{section}/$id` route param. */
  key: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Right-aligned cells, in order, provenance last. Keep to three or fewer. */
  meta?: readonly ReactNode[];
  /** Transient row: no navigation, no checkbox. Progress goes in `meta`. */
  disabled?: boolean;
};

export type BrowseListProps = {
  rows: readonly BrowseRow[];
  activeKey?: string;
  selectedKeys: ReadonlySet<string>;
  /** The whole selection, whether a tick, a right-click or `Space` changed it. */
  onSelectionChange: (keys: ReadonlySet<string>) => void;
  /** The row the user moved to; `undefined` when the active row was clicked again. */
  onActiveChange: (key: string | undefined) => void;
  status: 'loading' | 'ready' | 'error';
  emptyLabel?: string;
  /** Paging is the entity store's job; the list only reports it hit the end. */
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export type BrowseListHeaderProps = {
  allSelected: boolean | 'indeterminate';
  onSelectAllChange: (checked: boolean) => void;
  onRefresh: () => void;
  /** Section-specific control. Undefined renders the button inert — see § 3.6. */
  filter?: ReactNode;
  sort?: ReactNode;
};

export type BrowseSearchProps = {
  value: string;
  onChange: (value: string) => void;
  /** Greyed out rather than swallowing keystrokes while searching is unwired — § 3.6. */
  disabled?: boolean;
};

export type SortOption = { id: string; labelKey: string };
```

Rules:

- `activeKey` comes from the route, `selectedKeys` from the selection store, and **the two are
  alternatives, never a pair** — Content Studio's rule. A click anywhere but the checkbox drops the
  ticks (`rowClickTarget`); ticking a checkbox leaves the active row alone, so it never navigates.
- Skeleton, empty and error states live in the widget, not in pages.
- **Search is the page's state, never the widget's.** A section that loads whole filters what it
  already has: the query lives in a `pages/<section>/model/search.store.ts` atom, a pure
  `search<Domain>(items, query)` beside it does the matching, and no request leaves the browser — Roles
  matches display name, description and the name read off the key that way. A section that pages
  server-side (Users, once #37
  lands) moves the query into a URL search param (`?q=`, `?provider=`) so it survives a reload, and
  debounces input at 300 ms — `/identity` server events fan out per user and would otherwise thrash the
  list. The widgets stay stateless either way.
- **The details column follows the selection** (`shownRowKey`, applied wherever a selection change is
  reported — a tick, `Space`, `Select all`, a right-click, `Escape`): while anything is ticked it shows
  the row ticked last, and once nothing is it stays where it is. This is Content Studio's `currentItem`
  exactly: unticking the last row falls back to the one ticked before it, `Select all` moves the column
  to the last row, and clearing the ticks leaves the column on the row last touched rather than on a
  row from before the selection began. Tick order is the order of the selection set, so a store that
  reports a selection must preserve it — `createSelectionStore` does.
- **A query narrows what everything acts on, without unticking anything.** `Select all`,
  `selectAllState`, the keyboard cursor and `ActionContext.selected` all see the matching rows only —
  Content Studio scopes action availability the same way, through `loadedSelectionCount` — while ticks
  on hidden rows stay in the store and come back when the query clears. The cursor in particular is
  resolved against the rows on screen, so a filtered-out cursor cannot leave `Space` ticking a row
  nobody can see, and the tab stop, the focus ring and the arrows always agree on the same row.
- **Rows, geometry and states are Content Studio's content tree rows, without the tree.** The list is
  flat, so it is not `TreeList` — `role="listbox"` with `role="option"` rows — but it takes Studio's
  numbers so the two apps look like one:

  | Part                   | Classes                                                                             |
  | ---------------------- | ----------------------------------------------------------------------------------- |
  | Both columns           | `bg-surface-neutral`, the split handle between them                                 |
  | Action toolbar         | `h-15 px-5 py-2 gap-2 border-b border-bdr-soft`                                     |
  | List column            | `gap-5 p-5` — it owns all spacing of the three blocks inside it                     |
  | Search and list header | no outer padding of their own                                                       |
  | List header controls   | `gap-2.5` apart, each `px-4.5`, text at the 16px of size `md`; `@max-xl:px-2.5`     |
  | Select all             | `h-10 pl-2.5` so its box lines up with the rows', 18px on the label text only       |
  | Scroll container       | `gap-y-1.5`, no padding                                                             |
  | Row                    | `gap-2.5 px-2.5 py-1`, `hover:bg-surface-neutral-hover`                             |
  | Selected row           | `bg-surface-selected text-alt hover:bg-surface-selected-hover`, `data-tone=inverse` |

  Search, list header and list bring no outer padding at all: the 20px around and between them comes
  from the list column in `BrowseLayout`, so a section cannot drift from the others.

  The columns must sit on `surface-neutral`, not on the app's `surface-primary`: `surface-selected` is
  `grey-800` in both themes, which disappears against the `grey-900` app background in the dark theme.
  The label block is `ItemLabel` — `size-6` icon, `leading-5.5` title, `text-sm leading-4.5
text-subtle` subtitle — and it lives in `widgets/item-label/` because the details panel needs the same
  block.

- The whole row is the click target. The checkbox is a child of the row, so its handler calls
  `stopPropagation()` — ticking a row must not move `active` — and it stays out of the tab order, as
  the tree's own selection control does: the row owns focus and `Space` ticks it.
- **What the two states look like follows from that.** Ticked rows are painted selected; the active
  row is painted selected only while nothing is ticked. With nothing ticked, clicking the active row
  again reports `onActiveChange(undefined)` and the details column closes; with ticks present the
  same click only drops them and the active row stays.
- `Select all` means every row currently loaded, not every row matching the query — the widget cannot
  know the rest. Acting on more requires loading more first, so a bulk action reports the count it
  applies to.
- **The keyboard cursor is not the row on show.** The cursor is the row the user last pointed at — a
  click, an arrow, a right-click, a tick or an untick — and nothing else moves it; it takes the DOM
  focus and the tab stop, and it starts on the row a deep link opened. It deliberately does not follow
  the details column: unticking a row moves the column to the row ticked before it, and the focus has
  to stay under the hand that unticked. The cursor is Content Studio's `activeId` — which its checkbox
  control also sets on both tick and untick — while its details panel is the separate, derived
  `currentItem`.
- `ArrowUp`/`ArrowDown`/`Home`/`End` move the cursor (`nextRowKey` computes it, skipping transient
  rows). With nothing ticked the cursor and the row on show are the same thing, so the details column
  follows the arrows; **with rows ticked the arrows move the cursor alone**. `Space` ticks the row
  under the cursor. Because arrows can move the
  route, the page navigates with `replace: true` — a deep link still works, and arrowing down a list
  does not fill the history.
- One row is tabbable: the cursor's, or the first when the cursor is not in the list at all
  (`tabbableRowKey`), so a query that filters it out cannot leave the list without a tab stop. The
  cursor takes the DOM focus only while the focus is already inside the list, so a query that filters
  it out and back cannot yank the focus out of the search field — the guard is the
  `closest('[role="listbox"]')?.contains(document.activeElement)` check in `BrowseListRow.tsx`. The toolbar's own roving tabindex and arrow keys come from
  `Toolbar.Container`. Range select with `Shift` comes later.
- A `disabled` row exists for work in flight: an application being uploaded is a row before it is an
  application, keyed by its upload id, with a progress bar as its last meta cell. It must not
  navigate and must not be selectable, and `enabled(ctx)` in the toolbar never sees it, because it
  never enters the selection.

### 3.6 Header controls

The two controls the mockups show beside `Select all` and `Refresh` are wired where a section has
supplied them, and render as an inert button where it has not:

| Control                 | v1 state                                            |
| ----------------------- | --------------------------------------------------- |
| `Type to search` field  | working in every section that loads whole           |
| `Filter list` button    | working in all five sections; `disabled` where none |
| `Sort after` button     | working in all five sections; `disabled` where none |
| `Select all`, `Refresh` | fully working                                       |

A section supplies both through the slots in `BrowseListHeaderProps`, and the widgets behind them —
`BrowseFilter` and `BrowseSort` — stay section-agnostic: an entry is `{ id, label, count }` and an
option is `{ id, label }`. Supply nothing and the header renders its inert button.

**A narrow header drops the labels and keeps the icons.** Below `36rem` of header width — a comfortable
width for the current labels, with room to spare — `Refresh`, `Filter` and `Sort` are icons alone,
tightened to `px-2.5`. `Select all` keeps its text: it is the one control with no icon to fall back on.
Translations may want the number adjusted.

The query is on the header, which carries `@container`, not on the window: the split handle narrows the
list column on a wide screen too, and that is the case the icons exist for. Wrapping stays underneath as
the last resort — on both the outer row and the group of three, so the header can break under
`Select all` and also between the controls — because at the 300px column minimum not even three icons
fit beside `Select all`. `justify-between` survives that wrap, a line holding one item packing it to the
start. The action toolbar (§ 3.2) is a separate widget and keeps its fixed height.

Two things about the labels are easy to break:

- **A label cannot be the `Button` `label` prop.** `@enonic/ui` renders it as a bare text node, and CSS
  cannot hide one, so a control passes its label as a `span` child —
  `HEADER_CONTROL_CLASS` and `HEADER_CONTROL_LABEL_CLASS` in `browse-list/header-controls.ts` are the
  two class names, shared because `BrowseFilter` and `BrowseSort` render the same button as the header
  does. `Button` stays the direct child of `Menu.Trigger`: it is what takes the ref.
- **A hidden label leaves no accessible name.** A live control puts it on `title`, which `Button` also
  derives `aria-label` from, and which doubles as the tooltip. An inert one cannot: `disabled` brings
  `pointer-events-none`, so the button is never hovered and its own `title` never shows — hence the
  wrapping `span` in `InertHeaderControl`.

Nothing here is unit-tested: it is CSS, and the environment is `node`. Verification is the split handle
at 300px in both themes.

**A section that narrows on the server supplies entries without a count**, and `count` is optional for
that reason. Users takes its entries from the loaded provider list rather than from the rows — the rows
are one page, so a provider absent from it must still be offered — and there is no count to give: a
`findUsers` query reports one total for the whole match and nothing per provider, so each count would be
a request of its own. An entry with no count is always offered, since nothing tells it apart from an
empty one.

Roles settled the shape, and Groups and ID Providers follow it with entries of their own — one per ID
provider, and one per bound application with the unbound collected last. The filter is a multi-select:
nothing ticked narrows nothing, several ticked are a union, and counts are taken after the search but
before the filter itself, so they read as "where did the search find anything" rather than restating the
current narrowing. A bucket nothing falls into is dropped **unless it is ticked**, so a narrowing can
never become invisible and impossible to untick.

That invariant needs two things, and both are easy to get wrong. **Which entries exist comes from every
row, never from the searched ones** — counts alone follow the search — because an entry built from the
search disappears the moment the query stops matching it, taking a ticked one with it. And **an entry's
identity is read off the rows, never off a separately loaded list**: a principal key carries its provider,
a role key carries its project. Deciding a role's bucket against the loaded projects meant a failed
projects load reclassified every project role at once, so a ticked project bucket matched nothing while
vanishing from the menu. The loaded list contributes labels and the buckets that own no row yet; when it
is missing, the id stands in as the label.

**Applications is the one section whose unticked filter narrows, and it is deliberate.** It offers a
single entry, `System applications`, and it is an include toggle rather than a bucket: unticked — the
default — hides the applications XP itself ships, ticked shows the whole list. Those rows are noise for
an admin managing their own applications, which is why app-applications hid them behind the same toggle,
off by default; the empty selection every section starts and returns to is what expresses "hidden" here,
so nothing about the store or `resetOnLeave` is special-cased. The one rule that inverts with it is the
dropping of empty entries: the entry is offered whatever its count and never passes through
`visibleEntries`, because an absent entry would go on hiding rows with no control left on screen to
reveal them — the same failure the rule above prevents, arriving from the other direction — and a
checkbox appearing and vanishing as the user types is worse than one reading zero.

Sorting offers display name ascending and descending and nothing else. `modifiedTime` would be the
candidate for Roles and Groups and never arrives:
`PrincipalNodeTranslator` does not copy it off the node, which is a defect on the XP side rather than a
shape to design around — see `docs/platform-facts.md`.

The ticked buckets are per-section state like the selection and the query, and they are cleared on
leaving the section through `resetOnLeave` on `useBrowseSection`.

**Narrowing and ordering are the section's, not the framework's.** `useBrowseSection` takes `visible` —
the rows to show, in the order to show them — rather than a `filter(items, query)` callback: a section
with a bucket filter needs the searched items anyway, to count them, and a hook owning the search would
either run it twice or be handed a function ignoring both of its arguments.

Sorting also has a backend constraint. `findPrincipals` has no server-side sort — its translator
builds the node query with no order at all — so a section that pages cannot sort through it.
`findUsers` is the exception and takes both a query and a sort expression, which is what Users will
use; Applications, Roles, Groups and ID Providers load whole and sort client-side.

### 3.4 Details panel

Composition, not a descriptor object: sections differ too much to describe declaratively, and slots
let each of us add ours without editing the other's file.

```ts
// widgets/details-panel
export type DetailsHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Top-right control, e.g. the Applications state dropdown. */
  action?: ReactNode;
};

export type DetailsSectionProps = {
  labelKey: string;
  /** Appended to the label as `(7)`. */
  count?: number;
  /** Rendered at the end of the section, e.g. the Edit button. */
  action?: ReactNode;
  /** Optional: a counted section whose rows were not fetched is a heading and a number on its own. */
  children?: ReactNode;
};

export type DetailsSubsectionProps = {
  labelKey: string;
  /** Appended to the label as `(6)`. */
  count?: number;
  children: ReactNode;
};

export type DetailsFieldProps = {
  labelKey: string;
  children: ReactNode;
};

export type DetailsListItemProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Right-aligned, single cell — not the array `BrowseRow.meta` uses. */
  meta?: ReactNode;
};
```

```tsx
<DetailsPanel>
  <DetailsPanel.Header icon={…} title={…} subtitle={…} action={…} />

  <DetailsPanel.Section labelKey="applications.details.application" action={…}>
    <DetailsPanel.Field labelKey="applications.details.installed">{installed}</DetailsPanel.Field>
  </DetailsPanel.Section>

  <DetailsPanel.Section labelKey="users.details.roles" count={roles.length}>
    <DetailsPanel.List>
      <DetailsPanel.ListItem icon={…} title={…} subtitle={…} meta={…} />
    </DetailsPanel.List>
  </DetailsPanel.Section>
</DetailsPanel>
```

- Spacing and type scale: the panel is `p-10`, sections sit `gap-5` apart, and the header runs
  `gap-5` between a `size-12` icon and its text, which is `text-2xl` over `text-base` with `gap-2.5`
  between the two lines. Inside a section the label is `text-base`, entries sit `gap-2.5` apart, and
  a `Field` is `text-xs font-semibold` over `text-xs font-normal` — both in the main text colour —
  with `gap-1` between them.
- `Section` renders its label through `Separator label` (already uppercase — keep phrases
  sentence-case in the properties file) and appends `count` as `(7)` when given.
- `action` exists on both `Header` (the state dropdown in Applications) and `Section` (the
  `Edit role` / `Edit user` button, which sits inside the section, not in the header). A section
  renders it right-aligned below its content; the button is `variant="outline"` at size `sm`, so
  36px tall.
- `Subsection` splits a section's list by kind — `Members (8)` holding `Users (6)` and `Groups (2)`.
- **A section with nothing in it is not rendered at all**, and neither is an empty subsection:
  `Members (0)` is a label and a rule over empty space. `filledSections` beside the panel takes the
  sections a page is thinking of rendering and hands back the ones that have items, so every panel
  drops them the same way.
- `ListItem` gets an optional `expandable` later for the nested groups in the Groups mockup —
  additive, needed by Groups only.
- The panel scrolls independently of the list column.

### 3.5 Selection

```ts
// shared/selection
export type SelectionStore<K extends string = string> = {
  $selected: ReadableAtom<ReadonlySet<K>>;
  toggle: (key: K, checked?: boolean) => void;
  replace: (keys: readonly K[]) => void;
  clear: () => void;
};

export function createSelectionStore<K extends string = string>(): SelectionStore<K>;
```

One instance per section, created in `pages/<section>/model/`, next to a `createSearchStore()` for the
search box. Both are cleared on leaving the section, along with anything passed as `resetOnLeave` — a bucket filter
belongs there — and the selection on refresh as well. A section writes none of it by hand:
`useBrowseSection` takes the stores and does the clearing.

**There is no app-wide read-only flag.** The tool is already gated on `role:system.admin`, so whoever
is inside may act; a `$readOnly` atom would only be a second, weaker gate that every section has to
remember to thread through. Where an action must be refused, the refusal belongs in that action's
`enabled` next to the rule that motivates it — `isReservedRole` keeps Delete off the platform's own
roles and off every project's five — and anything the server must guarantee is guarded server-side, not by a UI flag.

## 4. Data contract

```
entities/principal/
  api/users.api.ts          the only place that talks to the server, one file per subdomain
  api/groups.api.ts
  model/users.store.ts      facts, computed, commands
  model/principal.types.ts  domain types — wire DTOs never leak past the api segment
  model/usePrincipals.ts    the hook pages use
  index.ts                  the slice's public API
```

Users, groups, roles and ID providers are one `principal` slice with a file per subdomain, because
they hold each other: a role lists its members, a group its members and roles, a user its roles and
groups, and an ID provider the principals that belong to it. Four slices would force either
cross-slice imports or domain types in `shared/`. Note that an ID provider is **not** a principal —
`PrincipalKey` is the closed union of `user:` / `group:` / `role:` keys, while a provider's key is a
plain string, and none of the key helpers apply to it. It lives in this slice because it references
principals, not because it is one. Applications is its own slice. Segment layout is in
`.claude/rules/structure.md`.

**The principal types are the platform's own.** `model/principal.types.ts` re-exports `Principal`,
`PrincipalKey`, `PrincipalType`, `User`, `Group`, `Role` and the three key types from
`@enonic-types/core`, so the client cannot drift from what `lib/xp/auth` returns and the keys keep
their template-literal form (`role:${string}`, `user:${string}:${string}`). Only what the platform
does not model is added locally: `Role` gains the `members` list that `getMembers` returns separately,
`Group` its members and roles, `User` its roles and groups plus the `description` and `createdTime` the
mockups ask for and `lib/xp/auth` does not carry; and `principal.keys.ts` holds the key helpers the UI
needs — `isPlatformRole`, `isReservedRole`, `projectRoleIdOf`, `isSystemUser`, `principalName`, `idProviderOf`. A key coming from a route stays a plain `string` until a principal answers to it, so
lookups like `useRole(id)` take `string`, never a cast to `PrincipalKey`.

- All I/O returns `ResultAsync<T, AppError>` through `shared/api`. Nothing else calls `fetch`.
- **An api function takes an `AbortSignal`, and whoever owns the load owns the cancelling.** `Refresh`
  and search retrigger it, so the previous one is aborted and its answer dropped — otherwise the slower of
  two requests decides what the list shows. The transport drops a request whose signal aborted before it
  reached the network, so an abandoned load costs the server nothing.
- **Who owns the load depends on how many domains the section reads.** A section reading one domain leaves
  it to that slice — `loadIdProviders` in `id-providers.load.ts`, `ensureApplications` in
  `applications.load.ts` — started from `pages/<section>/model/use<Section>Screen.ts`. A section reading
  several asks for them in one request and owns the load itself: `pages/<section>/model/<section>.screen.ts`
  fetches, fans the answer out into the stores through their `receive…` commands, and cancels. Either way
  the store itself holds no request, its hooks are plain reads, and the full contract is in
  `.claude/rules/stores.md` § Loading.
- **Caching is a line, not an accident.** `ensure<Domain>()` loads on a first visit and serves what it has
  on a later one; `load<Domain>()` always goes to the server. Applications caches, the principal sections
  do not, and both say so at their one call site.
- A reload the user did not ask for must not blank a list that is already on screen:
  `beginApplicationsLoad` reports `loading` only while it has nothing to show, so a server event or a
  reconnect never replaces the rows with a skeleton.
- Anything beyond a first load — reloading on `/identity` or `application` server events, paging
  orchestration — goes in a sibling `model/<name>.service.ts` with `start()`/`stop()` per
  `.claude/rules/stores.md`, never in a component effect.
- **A section that pages appends, and the differences are the contract.** `hasMore` comes from comparing
  the loaded rows against the total the search reported, never from a page arriving short. A reload keeps
  the rows on screen and replaces them when the answer lands — clearing them would swap the list for a
  skeleton on every debounced keystroke — while a first-page failure does clear them and a later-page
  failure does not, because the rows are what the user is reading. A duplicate key is dropped: offset
  paging over a set someone else is editing can hand back a row already loaded. And **the ticks go with the
  query**: a server-side query change clears the selection, because an action reaches only the rows on
  screen and ticks made on a page the new query does not return would silently shrink what `Delete`
  applies to. The client-side sections keep them, since there the hidden rows come back when the query
  clears.
- **A details panel takes its item from the route, never from a selection store in `entities/`.** The id
  comes from `useParams` and the panel asks a `use<Thing>(key)` hook for it. An `entities/` store that
  subscribed to "the selected key" instead would put per-section UI state in the domain slice and hide the
  load behind a second store; per `.claude/rules/stores.md` a store never derives from another store that
  way.
- **That hook loads by key, and it does so through `shared/detail`'s `createDetailLoader`.** One request
  in flight, a 250 ms debounce in front of it, a small key cache behind it, `forget()` on leaving the
  section and `invalidate()` when the list reloads so `Refresh` reaches the panel too. A domain supplies
  only its own read: `useUser`, `useRole` and `useGroup` are wrappers of twenty lines. Do not write the
  debounce again, and note that the loader tracks the selected key rather than reading it back off the
  state — the item on screen during a load is still the previous one.
- **A panel loads even where the section loads whole, and Roles is the case that settled it.** Reading the
  item out of the loaded list looks free, but the expensive half of a principal is its member lists, and no
  list may fetch those per row — so the panel has to ask for something regardless (see _Member lists on
  demand_ in `docs/unified-api.md`). Once it does, taking the scalars from the same answer costs nothing and
  buys independence from the list: the panel can tell a deleted item from one the list has not reached, and
  it keeps working when a section starts paging. `useApplicationInfo(key)` is the same shape from the other
  direction, and `useApplication(id)` is the one remaining list lookup.
- **Loading, failed and gone are three states in that panel, not one**, and conflating any pair of them
  lies to the reader. A panel keeps the item it has while the next is on its way, says
  `browse.details.loading` while it has none, and drops the item on failure rather than describing someone
  other than the selected row — `detailsEmptyLabelKey` beside the panel picks between the three, and a
  section passes only its own `<section>.details.failed`. The debounce is why `loading` matters: without
  that state a selection would read as a click that did nothing.
- Mapping a domain object to `BrowseRow` or to details fields happens in `pages/<section>/`.
- An api file runs in the browser and therefore always calls an HTTP endpoint. `lib/xp/auth`
  and every other `/lib/xp/*` module is server-side only — it belongs behind that endpoint, never in
  an api file. Issue #8 settled that shape as GraphQL, and all five sections now call it: the store, the
  hook and the page above each api file did not change when the fixtures were swapped out, which was the
  point of the arrangement. Nothing in the tree reads a fixture any more.
- The page turns keys into domain objects for `ActionContext`: `selected` is
  `rows.filter(r => selectedKeys.has(r.key))` mapped back through the entity list, `active` is the
  same lookup for the route's `$id`. The widgets never hold domain objects, and no separate key→item
  map is introduced.

## 5. Decisions and open questions

Decided:

1. The details column is always on screen and its content is route-driven: an item route fills it, and
   with nothing selected it shows its empty state instead of disappearing. Deep links keep working, and
   the list column keeps its width.
2. The two columns are a draggable split view with a `300px` minimum each; the width is remembered in
   `localStorage`. No collapse toggle in v1 — the mockups have none, and dragging covers it.
3. Item route stays `/{section}/$id` with hash history.
4. Search filters client-side wherever the section loads whole; `Filter list` and `Sort after` are
   supplied by all five sections now, and the slots stay inert for a section that supplies neither
   (§ 3.6). The last row meta cell is provenance; the undefined `Info` / `More info` cells are left out
   until they mean something.
5. No ID-provider tree — ID Providers is a flat section like the others.

Still open, needs design or product input:

6. **Active / Inactive on an ID provider.** The rows and the details `Status` field show it, but the
   platform has no such flag. Candidate readings: bound to an application _and_ that application is
   started; has an `idProviderConfig`; mounted on a vhost (`lib/xp/vhost.list()` exposes
   `idProviderKeys`).
7. **Functionality present today that the mockups drop** — in Applications only: the "show only
   selected" toggle, inherited from lib-admin-ui's `ListBoxToolbar` (app-users extends the plain
   `Toolbar` and has none). Issue #3 promises to rebuild all of app-applications, so dropping it has to
   be deliberate. The other half of this question is closed: `ApplicationsListToolbar`'s "show system
   applications" toggle came back as the section's one filter entry, off by default as it was (§ 3.6).
8. **Where "available version" comes from** — answered, and only the cell is left. `marketApplications`
   in the schema reads Enonic Market server-side and hands back `latest`, `installedVersion` and
   `updateAvailable` per application (#39), with `entities/market/` caching it for the session. What the
   row does with it — a second version in the meta cell, an update affordance, or nothing until the
   install dialog lands — is still open.
9. **Where the rest of #7 lives** — service accounts, public keys and permission reports have no
   place in the mockups. Second pass of the Users section.
