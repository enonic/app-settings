/** A section another application contributes through the `settings.section` interface. */
export type SectionExtension = {
  /** The descriptor key, `<app>:<name>`: the identity, and the tie-break when two sort equal. */
  key: string;
  /** Localized by the platform against the owning application's own bundle. */
  title: string;
  description?: string;
  /** Absolute url of the extension endpoint — the prefix the provider owns. */
  url: string;
  /** Always answers an image: the descriptor's icon, else the application's, else XP's own. */
  iconUrl: string;
  /** `config.order`, or `DEFAULT_ORDER` where the descriptor names none. */
  order: number;
  /** `config.path` — the url segment the section asks for. Nothing routes on it yet. */
  path?: string;
};

/** Where a section with no `config.order` sorts: after the first-party ones, which space theirs. */
export const DEFAULT_ORDER = 1000;
