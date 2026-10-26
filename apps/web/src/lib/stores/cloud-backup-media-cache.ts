import {
  planAssetUploads,
  type CloudBackupTiming,
} from "@codex/cloud-backup-sync";
import type { StorageLike } from "#lib/utils/runtime-deps.js";

/** Device-local media hashes. Storage/hash failures only increase upload work. */
export class CloudBackupMediaCache {
  hashes: Record<string, string> = {};

  constructor(private storage: () => StorageLike) {}

  reset(vaultId: string): void {
    this.hashes = {};
    this.save(vaultId);
  }

  /**
   * Detects unchanged media so the upload can skip known bytes. Timed apart
   * from the network: hashing is the CPU-proportional block on this side of
   * the upload. Falls back to uploading everything when hashing is
   * unavailable (no WebCrypto), as before.
   */
  async planUploads(
    assets: { assetId: string; bytes: Uint8Array; mimeType: string }[],
    timing?: (timing: CloudBackupTiming) => void,
  ): Promise<{
    skipAssetUploadIds: string[];
    freshHashes: Record<string, string>;
  }> {
    const hashStartedAt = performance.now();
    try {
      const plan = await planAssetUploads(assets, this.hashes);
      timing?.({
        stage: "hash",
        durationMs: performance.now() - hashStartedAt,
        count: assets.length,
        bytes: assets.reduce((total, asset) => total + asset.bytes.length, 0),
      });
      return {
        skipAssetUploadIds: plan.skippedIds,
        freshHashes: plan.hashes,
      };
    } catch {
      return { skipAssetUploadIds: [], freshHashes: {} };
    }
  }

  private hashCacheKey(vaultId: string): string {
    return `codex.cloud-backup-hashes.${vaultId}`;
  }

  load(vaultId: string): void {
    try {
      const raw = this.storage().getItem(this.hashCacheKey(vaultId));
      this.hashes = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      this.hashes = {};
    }
  }

  save(vaultId: string): void {
    try {
      this.storage().setItem(
        this.hashCacheKey(vaultId),
        JSON.stringify(this.hashes),
      );
    } catch {
      // Storage blocked: uploads just get more expensive, never broken.
    }
  }
}
