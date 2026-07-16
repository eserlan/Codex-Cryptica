import { zipSync, unzipSync, strToU8, strFromU8, type Zippable } from "fflate";
import {
  getOpfsRoot,
  getVaultDir,
  walkOpfsDirectory,
  readOpfsBlob,
  writeOpfsFile,
  VAULTS_DIR,
} from "./opfs";

/**
 * Portable vault backup: bundles an entire OPFS vault into a single `.zip`
 * that the user downloads, and restores one back into a fresh vault.
 *
 * Unlike "Save to Folder", this path uses plain browser download/upload
 * (`URL.createObjectURL` + `<a download>` / `<input type="file">`), so it
 * works on every browser — including Firefox, Safari, and Brave with the
 * File System Access API disabled.
 */

const ARCHIVE_FORMAT = "codex-vault-archive";
const ARCHIVE_VERSION = 1;
const MANIFEST_NAME = "codex-archive.json";
// All vault files live under this prefix inside the zip so the manifest at the
// root can never collide with a real vault file (e.g. the vault's own .codex/).
const VAULT_PREFIX = "vault/";

export const VAULT_ARCHIVE_EXTENSION = ".codex.zip";

interface ArchiveManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  vaultName: string;
  exportedAt: string;
  fileCount: number;
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-");
  return cleaned.length > 0 ? cleaned : "vault";
}

/**
 * Bundles a vault into a zip and triggers a browser download.
 * Returns the number of files archived.
 */
export async function exportVaultToZip(
  vaultId: string,
  vaultName: string,
): Promise<number> {
  const root = await getOpfsRoot();
  const vaultDir = await getVaultDir(root, vaultId);
  const files = await walkOpfsDirectory(vaultDir);

  const zippable: Zippable = {};
  for (const { path } of files) {
    const blob = await readOpfsBlob(path, vaultDir);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    zippable[VAULT_PREFIX + path.join("/")] = bytes;
  }

  const manifest: ArchiveManifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    vaultName,
    exportedAt: new Date().toISOString(),
    fileCount: files.length,
  };
  zippable[MANIFEST_NAME] = strToU8(JSON.stringify(manifest, null, 2));

  const zipped = zipSync(zippable, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(
    zipped,
    `${sanitizeFilename(vaultName)}-${stamp}${VAULT_ARCHIVE_EXTENSION}`,
  );

  return files.length;
}

function triggerDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface ImportedVaultArchive {
  vaultName: string;
  files: Array<{ path: string[]; bytes: Uint8Array }>;
}

/**
 * Parses a vault archive zip into its manifest name and file list, without
 * touching OPFS. Throws if the file isn't a recognizable Codex vault archive.
 */
export async function parseVaultArchive(
  file: File | Blob,
): Promise<ImportedVaultArchive> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch (err) {
    throw new Error(
      "This file isn't a valid zip archive. Choose a Codex vault backup " +
        `(${VAULT_ARCHIVE_EXTENSION}) file.`,
      { cause: err },
    );
  }

  const manifestRaw = unzipped[MANIFEST_NAME];
  if (!manifestRaw) {
    throw new Error(
      "This zip isn't a Codex vault backup — it has no archive manifest.",
    );
  }

  let manifest: ArchiveManifest;
  try {
    manifest = JSON.parse(strFromU8(manifestRaw));
  } catch (err) {
    throw new Error("The vault backup's manifest is corrupted.", {
      cause: err,
    });
  }

  if (manifest.format !== ARCHIVE_FORMAT) {
    throw new Error("This zip isn't a Codex vault backup.");
  }
  if (manifest.version > ARCHIVE_VERSION) {
    throw new Error(
      "This backup was made by a newer version of Codex Cryptica. Please update before importing.",
    );
  }

  const files: ImportedVaultArchive["files"] = [];
  for (const [name, content] of Object.entries(unzipped)) {
    if (name === MANIFEST_NAME) continue;
    if (!name.startsWith(VAULT_PREFIX)) continue;
    const relative = name.slice(VAULT_PREFIX.length);
    // Zip directory entries end in "/" and have no content; skip them.
    if (relative.length === 0 || name.endsWith("/")) continue;

    // Don't trust archive-supplied paths. Empty segments (e.g. "vault//x") or
    // "."/".." would either throw deep in the OPFS write or, worse, escape the
    // vault directory. Reject the whole import if any path looks unsafe.
    const segments = relative.split("/");
    if (segments.some((s) => s === "" || s === "." || s === "..")) {
      throw new Error(
        `The backup contains an unsafe file path ("${name}") and can't be imported.`,
      );
    }
    files.push({ path: segments, bytes: content });
  }

  // Integrity check: a well-formed archive's manifest count matches the files
  // we actually extracted. A mismatch means truncation or tampering.
  if (
    typeof manifest.fileCount === "number" &&
    files.length !== manifest.fileCount
  ) {
    throw new Error(
      `The backup is incomplete or corrupted (manifest lists ${manifest.fileCount} ` +
        `file${manifest.fileCount === 1 ? "" : "s"}, found ${files.length}).`,
    );
  }

  return {
    vaultName: manifest.vaultName || "Imported Vault",
    files,
  };
}

/**
 * Writes an already-parsed archive's files into a freshly created vault's
 * OPFS directory. Returns the number of files written.
 */
export async function writeArchiveToVault(
  vaultId: string,
  archive: ImportedVaultArchive,
): Promise<number> {
  const root = await getOpfsRoot();
  let written = 0;
  for (const { path, bytes } of archive.files) {
    await writeOpfsFile(
      [VAULTS_DIR, vaultId, ...path],
      new Blob([bytes as BlobPart]),
      root,
      vaultId,
    );
    written++;
  }
  return written;
}
