import type { Entity } from "schema";

export type LocalEntity = Omit<Entity, "_path"> & {
  _path?: string[];
};

export interface FileEntry {
  handle: FileSystemFileHandle;
  path: string[];
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
