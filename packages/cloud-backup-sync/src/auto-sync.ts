/**
 * Automatic background sync primitives (#3189).
 *
 * Pure functions over injected values. The app layer owns timers, lifecycle
 * events, and connectivity; everything here is deterministic and unit-tested.
 *
 * Two cost/safety realities shape this module:
 *
 * - A push uploads a whole snapshot, so autosync must avoid re-uploading
 *   unchanged media: `planAssetUploads` compares content hashes and the
 *   uploader skips bytes the server already holds (their ids are still
 *   listed in the commit, so nothing is pruned).
 * - The commit endpoint is last-write-wins with no server revision, so
 *   `expectLastPushedAt` is a best-effort optimistic-concurrency guard, not
 *   a true transaction: it closes the common two-device case but cannot
 *   close a genuine race. That needs server revisions (follow-up).
 */

/** SHA-256 of bytes as lowercase hex. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto SHA-256 is unavailable.");
  const digest = await subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PlannedAssetUploads {
  /** Assets whose bytes must be PUT. */
  toUpload: { assetId: string; bytes: Uint8Array; mimeType: string }[];
  /** Ids whose bytes match the known hashes and can skip the PUT. */
  skippedIds: string[];
  /** Fresh hashes for every asset, for the caller to persist on success. */
  hashes: Record<string, string>;
}

/**
 * Splits assets into must-upload vs known-unchanged by content hash.
 * `knownHashes` maps assetId to the hash of the bytes last uploaded.
 */
export async function planAssetUploads(
  assets: { assetId: string; bytes: Uint8Array; mimeType: string }[],
  knownHashes: Record<string, string>,
  hash: (bytes: Uint8Array) => Promise<string> = sha256Hex,
): Promise<PlannedAssetUploads> {
  const toUpload: PlannedAssetUploads["toUpload"] = [];
  const skippedIds: string[] = [];
  const hashes: Record<string, string> = {};
  for (const asset of assets) {
    const digest = await hash(asset.bytes);
    hashes[asset.assetId] = digest;
    if (knownHashes[asset.assetId] === digest) skippedIds.push(asset.assetId);
    else toUpload.push(asset);
  }
  return { toUpload, skippedIds, hashes };
}

/**
 * Best-effort conflict check: true when the remote manifest is newer than
 * our last push, meaning another device committed since. ISO timestamps
 * compare lexicographically. Null local means "never pushed from here" —
 * that is only a conflict when the remote has commits we did not make,
 * which this device cannot know, so it reports false (first push wins).
 */
export function detectConflict(
  localLastPushedAt: string | null,
  remoteLastPushedAt: string | null,
): boolean {
  if (!localLastPushedAt || !remoteLastPushedAt) return false;
  return remoteLastPushedAt > localLastPushedAt;
}
