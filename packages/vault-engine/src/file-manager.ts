import { type IdGenerator, systemIdGenerator } from "@codex/runtime";
import type { IAssetIOAdapter } from "./asset-manager";

export const MAX_VAULT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ImportedVaultFile {
  path: string;
  name: string;
  mimeType: string;
  size: number;
}

export type FileImportFailureReason =
  "empty" | "too_large" | "vault_unavailable" | "write_failed";

export type FileImportResult =
  | { ok: true; file: ImportedVaultFile }
  | { ok: false; reason: FileImportFailureReason };

export interface FileManagerDependencies {
  ioAdapter: Pick<IAssetIOAdapter, "writeOpfsFile">;
  idGenerator?: IdGenerator;
}

function safeFileName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || "file";
}

/** Persists arbitrary user-selected files without treating them as images or entities. */
export class FileManager {
  private readonly idGenerator: IdGenerator;

  constructor(private deps: FileManagerDependencies) {
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
  }

  async importFile(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    file: File,
  ): Promise<FileImportResult> {
    if (!vaultHandle) return { ok: false, reason: "vault_unavailable" };
    if (file.size === 0) return { ok: false, reason: "empty" };
    if (file.size > MAX_VAULT_FILE_SIZE_BYTES) {
      return { ok: false, reason: "too_large" };
    }

    const path = `files/${this.idGenerator.uuid()}-${safeFileName(file.name)}`;
    try {
      await this.deps.ioAdapter.writeOpfsFile(
        path.split("/"),
        file,
        vaultHandle,
        vaultHandle.name,
      );
    } catch {
      return { ok: false, reason: "write_failed" };
    }

    return {
      ok: true,
      file: {
        path,
        name: file.name || "file",
        mimeType: file.type,
        size: file.size,
      },
    };
  }
}
