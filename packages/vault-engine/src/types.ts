import type { Entity } from "schema";

export type LocalEntity = Omit<Entity, "_path"> & {
  _path?: string[];
};

export interface FileEntry {
  handle: FileSystemFileHandle;
  path: string[];
}

/**
 * Top-level vault directories that hold internal/system storage (random
 * tables, decks, uploaded files) rather than user-facing entities. Files
 * under these directories must never be surfaced as entities in the vault
 * entity list — see #2735.
 */
export const TABLE_DIR = "_tables";
export const DECK_DIR = "_decks";
export const FILES_DIR = "files";
export const RESERVED_VAULT_DIRS = [TABLE_DIR, DECK_DIR, FILES_DIR] as const;

/** True if `path` (as returned by a directory walker) falls under a reserved vault directory. */
export function isReservedVaultPath(path: string[]): boolean {
  return (RESERVED_VAULT_DIRS as readonly string[]).includes(path[0]);
}

export interface VaultState {
  status: "idle" | "loading" | "saving" | "error";
  syncType: "local" | null;
  syncStats: {
    updated: number;
    created: number;
    deleted: number;
    failed: number;
    total: number;
    progress: number;
  };
  hasConflictFiles: boolean;
  selectedEntityId: string | null;
}
