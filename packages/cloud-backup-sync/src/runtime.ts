/**
 * Injected runtime dependencies for cloud backup (#2593, spec 162).
 *
 * Everything the package touches from the outside world arrives here, so the
 * whole surface can be unit-tested without a network or a browser — the same
 * constructor-DI shape `@codex/gdrive-sync` uses (Constitution VIII).
 */

/** The subset of `fetch` this package needs. */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    /** JSON text, or the raw bytes of a single asset upload. */
    body?: string | Uint8Array;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

/**
 * Per-vault local persistence. Backed by IndexedDB in the app; a plain map in
 * tests. This is what makes the enabled state and ownership code survive a
 * reload (FR-020) — and it holds the only copy of the ownership code that
 * exists outside the user's own notes.
 */
export interface CloudBackupStorage {
  read(vaultId: string): Promise<unknown | null>;
  write(vaultId: string, record: unknown): Promise<void>;
  clear(vaultId: string): Promise<void>;
  /**
   * Every record this device holds.
   *
   * Optional so an implementation that cannot enumerate still satisfies the
   * interface; without it the app simply offers no known backups to pick from.
   */
  list?(): Promise<{ vaultId: string; record: unknown }[]>;
}

export interface CloudBackupRuntime {
  /** Base URL of the worker, e.g. `https://oracle-proxy.example.workers.dev`. */
  baseUrl: string;
  fetch: FetchLike;
  storage: CloudBackupStorage;
  /** Injectable so tests can assert timestamps without freezing global time. */
  now?: () => Date;
}

/** In-memory storage, for tests and for a runtime with no IndexedDB. */
export function createMemoryStorage(): CloudBackupStorage {
  const store = new Map<string, unknown>();
  return {
    async read(vaultId) {
      return store.has(vaultId) ? store.get(vaultId) : null;
    },
    async write(vaultId, record) {
      store.set(vaultId, record);
    },
    async clear(vaultId) {
      store.delete(vaultId);
    },
    async list() {
      return [...store.entries()].map(([vaultId, record]) => ({
        vaultId,
        record,
      }));
    },
  };
}
