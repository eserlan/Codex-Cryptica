import { type SyncEntry, type FileMetadata } from "./types";

export type SyncActionType =
  | "CREATE_LOCAL"
  | "CREATE_OPFS"
  | "UPDATE_LOCAL"
  | "UPDATE_OPFS"
  | "DELETE_LOCAL"
  | "DELETE_OPFS"
  | "MATCH_INITIAL"
  | "SKIP";

export interface SyncAction {
  type: SyncActionType;
  path: string;
  localMetadata?: FileMetadata;
  opfsMetadata?: FileMetadata;
  registryEntry?: SyncEntry;
  isConflict?: boolean;
}

export class DiffAlgorithm {
  private static readonly SKEW_MS = 2000;

  static calculateAction(
    path: string,
    local: FileMetadata | undefined,
    opfs: FileMetadata | undefined,
    registry: SyncEntry | undefined,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
  ): SyncAction | Promise<SyncAction> {
    const localChanged =
      local && registry
        ? this.hasChanged(
            local.lastModified,
            local.size,
            registry.lastLocalModified,
            registry.size,
            local.hash,
            undefined, // No registry local hash yet
          )
        : !!local;

    const opfsChanged =
      opfs && registry
        ? this.hasChanged(
            opfs.lastModified,
            opfs.size,
            registry.lastOpfsModified,
            registry.size,
            opfs.hash,
            registry.remoteHash,
          )
        : !!opfs;

    const validate = async () => {
      // Validate LOCAL if it's new or changed and might be the source of an update
      if (local && localChanged && (!opfs || !registry || opfsChanged)) {
        if (validator) {
          const isValid = await validator(path, local);
          if (!isValid) return { type: "SKIP" as const, path };
        }
      }

      // Validate OPFS if it's new or changed and might be the source of an update
      if (opfs && opfsChanged && (!local || !registry || localChanged)) {
        if (validator) {
          const isValid = await validator(path, opfs);
          if (!isValid) return { type: "SKIP" as const, path };
        }
      }

      return this.performCalculation(
        path,
        local,
        opfs,
        registry,
        localChanged,
        opfsChanged,
      );
    };

    // If validator is provided, we treat the whole thing as async for simplicity,
    // but we only do it if the file actually exists and changed.
    if (validator && ((local && localChanged) || (opfs && opfsChanged))) {
      return validate();
    }

    // Otherwise perform synchronous calculation
    return this.performCalculation(
      path,
      local,
      opfs,
      registry,
      localChanged,
      opfsChanged,
    );
  }

  private static performCalculation(
    path: string,
    local: FileMetadata | undefined,
    opfs: FileMetadata | undefined,
    registry: SyncEntry | undefined,
    localChanged: boolean,
    opfsChanged: boolean,
  ): SyncAction {
    // 0. Explicit Deletion Signals (Delta Sync)
    if (opfs?.isDeleted && local && registry) {
      return { type: "DELETE_LOCAL", path, registryEntry: registry };
    }
    if (local?.isDeleted && opfs && registry) {
      return { type: "DELETE_OPFS", path, registryEntry: registry };
    }

    // 1. New File Case (Not in registry)
    if (!registry) {
      if (local && !local.isDeleted && (!opfs || opfs.isDeleted)) {
        return { type: "CREATE_OPFS", path, localMetadata: local };
      }
      if (opfs && !opfs.isDeleted && (!local || local.isDeleted)) {
        return { type: "CREATE_LOCAL", path, opfsMetadata: opfs };
      }
      if (local && !local.isDeleted && opfs && !opfs.isDeleted) {
        // Exists in both but no record. Check if they are identical.
        const match = !this.hasChanged(
          local.lastModified,
          local.size,
          opfs.lastModified,
          opfs.size,
        );
        if (match) {
          return {
            type: "MATCH_INITIAL",
            path,
            localMetadata: local,
            opfsMetadata: opfs,
          };
        }
        // Exists in both and differ. Resolve via newest-wins.
        const action = this.resolveConflict(path, local, opfs);
        return { ...action, isConflict: true };
      }
      return { type: "SKIP", path };
    }

    // 2. Deletion Detection
    if (!local) {
      if (opfs) {
        return { type: "DELETE_OPFS", path, registryEntry: registry };
      }
      return { type: "SKIP", path };
    }

    if (!opfs) {
      if (local) {
        return { type: "DELETE_LOCAL", path, registryEntry: registry };
      }
      return { type: "SKIP", path };
    }

    // 3. Modification Detection
    if (!localChanged && !opfsChanged) {
      return { type: "SKIP", path };
    }

    if (localChanged && !opfsChanged) {
      return { type: "UPDATE_OPFS", path, localMetadata: local };
    }

    if (!localChanged && opfsChanged) {
      return { type: "UPDATE_LOCAL", path, opfsMetadata: opfs };
    }

    // Both changed - Conflict
    const action = this.resolveConflict(path, local, opfs);
    return { ...action, isConflict: true };
  }

  private static hasChanged(
    currentMod: number,
    currentSize: number,
    regMod: number,
    regSize: number,
    currentHash?: string,
    regHash?: string,
  ): boolean {
    if (currentHash && regHash && currentHash === regHash) return false;
    if (currentSize !== regSize) return true;
    return Math.abs(currentMod - regMod) > this.SKEW_MS;
  }

  private static resolveConflict(
    path: string,
    local: FileMetadata,
    opfs: FileMetadata,
  ): SyncAction {
    if (local.lastModified >= opfs.lastModified) {
      return { type: "UPDATE_OPFS", path, localMetadata: local };
    } else {
      return { type: "UPDATE_LOCAL", path, opfsMetadata: opfs };
    }
  }
}
