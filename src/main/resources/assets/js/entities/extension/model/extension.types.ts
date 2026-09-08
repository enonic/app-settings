/** A section another application contributes through the `settings.section` interface. */
export type SectionExtension = {
  /** The descriptor key, `<app>:<name>`: the identity, and the tie-break when two sort equal. */
  key: string;
  /** Localized by the platform against the owning application's own bundle. */
  title: string;
  description?: string;
  /** Absolute url of the extension endpoint — the prefix the provider owns. */
  url: string;
  /** The ES module the host imports: the prefix plus the contract's fixed entry path. */
  moduleUrl: string;
  /** Always answers an image: the descriptor's icon, else the application's, else XP's own. */
  iconUrl: string;
  /** `config.order`, or `DEFAULT_ORDER` where the descriptor names none. */
  order: number;
  /** `config.path` — the url segment the section asks for; `slug` is what it got. */
  path?: string;
  /** `config.module` — names a sharing group within the app; absent, the app itself is the group. */
  module?: string;
  /** The url segment the shell routes on: the asked-for path, or the key where that was taken. */
  slug: string;
};

/** Where a section with no `config.order` sorts: after the first-party ones, which space theirs. */
export const DEFAULT_ORDER = 1000;
