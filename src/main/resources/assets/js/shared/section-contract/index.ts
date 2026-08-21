/**
 * The whole client-side contract between this shell and a section another application provides.
 *
 * ! Duplicated verbatim in every provider repo until `@enonic/toolkit/section` publishes it
 * ! (`docs/extensions.md`, Phase 2). Change one copy and a provider compiles against a contract the
 * ! host does not implement, which nothing but a broken mount reports.
 *
 * The types are deliberately dumb — names and one-line docs. The rules they cannot express are in
 * `docs/extensions.md` § 2, and the host owns them.
 */

/**
 * Anything mutable the host hands over. A nanostores atom satisfies this structurally, which is why
 * the contract never names one — and why `subscribe` may call back straight away with the current
 * value. A guest's callback has to tolerate that.
 */
export type Readable<T> = { get(): T; subscribe(cb: (v: T) => void): () => void };

export type XpServerEvent = { type: string; timestamp?: number; data?: Record<string, unknown> };

export type Notification = {
  level: 'info' | 'success' | 'warning' | 'error';
  /** Already localized by the guest: no i18n key crosses the boundary. */
  message: string;
  autoClose?: number | false;
  action?: { label: string; onAction(): void };
};

export type Host = {
  /** The mounted module's own extension prefix — its data plane lives under it. */
  baseUrl: string;
  /** Resolved page locale; a locale change reloads the page, so it never changes mid-mount. */
  locale: string;
  /** Resolved theme; the guest applies it inside its shadow root. */
  theme: Readable<'light' | 'dark'>;
  /** SubPath incl. search params; back/forward arrive here. */
  path: Readable<string>;
  /** Programmatic navigation within the module's own segment. */
  navigate(subPath: string, opts?: { replace?: boolean }): void;
  /** Href builder for real anchors within the module's own segment. */
  url(subPath: string): string;
  /** The host's single socket, fanned out; filter in the callback. */
  subscribeEvents(cb: (event: XpServerEvent) => void): () => void;
  /** Toast on the host's stack; returns dismiss. */
  notify(n: Notification): () => void;
};

export type MountOptions = {
  /** Inside an open shadow root the host created. */
  container: HTMLElement;
  /** Valid until unmount, then revoked: a stale reference's calls become no-ops. */
  host: Host;
};

/** Idempotent, and must not throw. The host wraps it anyway. */
export type Unmount = () => void;

export type SectionModule = { mount(opts: MountOptions): Unmount };
