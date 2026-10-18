/**
 * Flushes pending entity saves when the page is hidden or closed (#2584).
 *
 * Entity writes are debounced by 400ms and then queued to OPFS. Until this
 * existed, nothing drained that queue on the way out: `flushPendingSaves` was
 * only called on vault switch and during import review. A user who edited an
 * entity and closed the app shortly afterwards lost the write, with no signal
 * that anything had gone wrong — the in-memory state, and therefore the UI, had
 * already shown it as saved.
 *
 * Two events, doing different jobs:
 *
 * - `visibilitychange` → hidden is the one that actually saves data. It fires
 *   when the user switches tab, minimises, or moves to another app — normally
 *   well before the page is torn down, so the write has real time to land.
 * - `pagehide` is the last-chance flush. It is more reliable than
 *   `beforeunload` (which mobile browsers often skip, and which the bfcache
 *   path does not guarantee), but the browser will not wait for our async OPFS
 *   write. It narrows the window rather than closing it.
 *
 * Neither event can *guarantee* a write completes during teardown. What this
 * removes is the far larger failure: a save still sitting in a 400ms timer,
 * never even started.
 */

export interface FlushSavesDeps {
  /** Drains the debounce timers and waits for queued writes. */
  flushPendingSaves: () => Promise<void>;
  /** Injectable for tests. */
  window?: Pick<Window, "addEventListener" | "removeEventListener">;
  document?: Pick<
    Document,
    "addEventListener" | "removeEventListener" | "visibilityState"
  >;
}

/**
 * Registers the handlers and returns a cleanup function.
 *
 * Failures are swallowed deliberately: this runs while the page is going away,
 * and an unhandled rejection at that point is noise the user cannot act on. The
 * save queue already retries and re-queues transient OPFS failures.
 */
export function registerFlushSavesOnHide(deps: FlushSavesDeps): () => void {
  const win =
    deps.window ?? (typeof window !== "undefined" ? window : undefined);
  const doc =
    deps.document ?? (typeof document !== "undefined" ? document : undefined);

  if (!win && !doc) return () => {};

  const flush = () => {
    try {
      void deps.flushPendingSaves().catch(() => {});
    } catch {
      // Never let a teardown-time failure surface as an unhandled error.
    }
  };

  const onPageHide = () => flush();
  const onVisibilityChange = () => {
    if (doc?.visibilityState === "hidden") flush();
  };

  win?.addEventListener("pagehide", onPageHide);
  doc?.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    win?.removeEventListener("pagehide", onPageHide);
    doc?.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
