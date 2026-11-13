/**
 * CC Cloud Backup client (spec 162, issue #2593).
 *
 * Pure functions over an injected runtime, so the whole surface is testable
 * without a network or a browser. `apps/web` supplies the real `fetch` and an
 * IndexedDB-backed store; tests supply mocks.
 *
 * Two invariants shape the design:
 *
 * - **Local wins, always.** These functions mirror a vault outward, on demand.
 *   A failed upload must never affect local work (FR-019), so
 *   `pushVaultToCloudBackup` reports failure rather than throwing.
 * - **Nothing leaves the device before consent.** No function here transmits
 *   anything for a vault with no local record, which is what makes "off by
 *   default" enforceable rather than merely intended (FR-001, FR-003).
 */
export type {
  VaultBundlePayload,
  UploadProgress,
  CloudBackupTimingStage,
  CloudBackupTiming,
  SnapshotUploadOptions,
  CloudBackupOutcome,
} from "./types";
export {
  getLocalCloudBackupRecord,
  listKnownCloudBackups,
  getCloudBackupOwnershipCode,
  type KnownCloudBackup,
} from "./backup-records";

export { ASSET_UPLOAD_CONCURRENCY } from "./asset-upload";
export { pushVaultToCloudBackup, type PushVaultOptions } from "./snapshot-sync";

export {
  enableCloudBackup,
  attachCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
} from "./backup-lifecycle";
export { pushDeltaToCloudBackup, type VaultDeltaPayload } from "./delta-sync";
export { fetchCloudBackupIndex, getCloudBackupStatus } from "./backup-metadata";
export {
  fetchCloudBackupAsset,
  restoreVaultFromCloudBackup,
} from "./backup-restore";
