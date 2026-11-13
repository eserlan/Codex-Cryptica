/** Payloads, outcomes and instrumentation shared by cloud backup operations. */
export interface VaultBundlePayload {
  vaultTitle: string;
  bundle: unknown;
  /**
   * Media as raw bytes. Uploaded one request each rather than inlined here, so
   * neither end has to hold a whole vault in memory (and so base64 does not
   * add a third to every byte on the wire).
   */
  assets?: { assetId: string; bytes: Uint8Array; mimeType: string }[];
}

/** Progress across a snapshot upload, for a caller that wants to show it. */
export interface UploadProgress {
  uploaded: number;
  total: number;
}

/**
 * Privacy-safe stage timing: counts, bytes and milliseconds only, never
 * content. Shared vocabulary so the app can attribute a save across layers —
 * `hydrate`/`build` are measured where the snapshot is assembled, `hash`
 * where unchanged media is detected, `serialize`/`upload` where it leaves.
 * Exists to answer "is the main thread the bottleneck" with numbers.
 */
export type CloudBackupTimingStage =
  "hydrate" | "build" | "hash" | "serialize" | "upload";

export interface CloudBackupTiming {
  stage: CloudBackupTimingStage;
  durationMs: number;
  /** Items processed (entities hydrated, assets hashed, files uploaded). */
  count?: number;
  /** Bytes processed (asset bytes read, commit body length). */
  bytes?: number;
}

export type CloudBackupOutcome<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: string;
      status?: number;
      /**
       * Set on the conflict path (#3189): the remote changed since our last
       * push, so nothing was uploaded. The caller must preserve local data
       * and surface the conflict instead of retrying blindly.
       */
      conflict?: boolean;
      remoteLastPushedAt?: string | null;
    };

export interface SnapshotUploadOptions {
  /**
   * Asset ids whose bytes the server already holds (#3189 autosync): their
   * PUT is skipped but they are still listed in the commit, so nothing is
   * pruned. Skipped assets count as uploaded for progress purposes.
   */
  skipAssetUploadIds?: ReadonlySet<string> | readonly string[];
  /** Cancels remaining uploads and prevents an aborted push from rewriting local status. */
  signal?: AbortSignal;
  /** Stage timings for the worker-or-not question; same pattern as `onProgress`. */
  onTiming?: (timing: CloudBackupTiming) => void;
}
