import { type SyncEntry, type FileMetadata } from "./types";

export type SyncActionType =
  | "EXPORT_TO_FS" // A) Only OPFS changed, or F) New on OPFS, or D) FS deleted (recreate)
  | "IMPORT_TO_OPFS" // B) Only FS changed, or F) New on FS
  | "DELETE_FS" // E) OPFS deleted and FS unchanged
  | "HANDLE_CONFLICT" // C) Both changed
  | "MATCH_INITIAL" // Exists in both, unrecorded, but identical
  | "SKIP";

export interface SyncAction {
  type: SyncActionType;
  path: string;
  fsMetadata?: FileMetadata;
  opfsMetadata?: FileMetadata;
  registryEntry?: SyncEntry;
  isConflict?: boolean;
}

export class DiffAlgorithm {
  static async calculateAction(
    path: string,
    fs: FileMetadata | undefined,
    opfs: FileMetadata | undefined,
    registry: SyncEntry | undefined,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
  ): Promise<SyncAction> {
    const opfsExists = opfs && !opfs.isDeleted;
    const fsExists = fs && !fs.isDeleted;

    // Determine change state based on the authoritative manifest (registry)
    let opfsChanged: boolean;
    let fsChanged: boolean;

    if (registry) {
      // OPFS Changed: Compare current OPFS hash to the stored manifest hash
      // Note: If hash is missing, we must assume it changed to be safe,
      // but the ideal flow ensures hashes are always written to the manifest.
      opfsChanged = !!(
        opfsExists &&
        (!registry.lastSyncedOpfsHash ||
          registry.lastSyncedOpfsHash !== opfs.hash)
      );

      // FS Changed: Compare current FS (size + mtime) to stored manifest fingerprint
      fsChanged = !!(
        fsExists &&
        (registry.lastSyncedFsSize === undefined ||
          registry.lastSyncedFsModified === undefined ||
          fs.size !== registry.lastSyncedFsSize ||
          fs.lastModified !== registry.lastSyncedFsModified)
      );
    } else {
      // If there's no registry entry, both are considered "changed" / new
      opfsChanged = !!opfsExists;
      fsChanged = !!fsExists;
    }

    // Optional Validation
    if (validator) {
      if (fsExists && fsChanged) {
        const isValid = await validator(path, fs);
        if (!isValid) return { type: "SKIP", path };
      }
      if (opfsExists && opfsChanged) {
        const isValid = await validator(path, opfs);
        if (!isValid) return { type: "SKIP", path };
      }
    }

    // --- Decision Table Application ---

    // 1. No Registry Entry (Initial Encounter)
    if (!registry) {
      if (opfsExists && !fsExists)
        return { type: "EXPORT_TO_FS", path, opfsMetadata: opfs };
      if (!opfsExists && fsExists)
        return { type: "IMPORT_TO_OPFS", path, fsMetadata: fs };
      if (opfsExists && fsExists) {
        // Exists in both but no record. Assume conflict unless sizes perfectly match.
        // A true hash check would be ideal here, but we default to conflict for safety.
        if (fs.size === opfs.size) {
          // If sizes match on initial encounter, we assume they are identical
          // to prevent mass-conflicts on first run.
          return {
            type: "MATCH_INITIAL",
            path,
            fsMetadata: fs,
            opfsMetadata: opfs,
          };
        }
        return {
          type: "HANDLE_CONFLICT",
          path,
          fsMetadata: fs,
          opfsMetadata: opfs,
          isConflict: true,
        };
      }
      return { type: "SKIP", path };
    }

    // 2. A) Only OPFS changed -> Export to FS
    if (opfsChanged && !fsChanged && opfsExists && fsExists) {
      return { type: "EXPORT_TO_FS", path, opfsMetadata: opfs };
    }

    // 3. B) Only FS changed -> Import to OPFS
    if (!opfsChanged && fsChanged && opfsExists && fsExists) {
      return { type: "IMPORT_TO_OPFS", path, fsMetadata: fs };
    }

    // 4. C) Both changed -> Conflict
    if (opfsChanged && fsChanged && opfsExists && fsExists) {
      return {
        type: "HANDLE_CONFLICT",
        path,
        fsMetadata: fs,
        opfsMetadata: opfs,
        isConflict: true,
      };
    }

    // 5. F) New file on FS (not in manifest) -> Import to OPFS
    if (!opfsExists && fsExists && fsChanged) {
      return { type: "IMPORT_TO_OPFS", path, fsMetadata: fs };
    }

    // 6. G) New file in OPFS (exists in manifest but not in FS) -> Export to FS
    if (opfsExists && !fsExists && opfsChanged) {
      return { type: "EXPORT_TO_FS", path, opfsMetadata: opfs };
    }

    // 7. D) FS deleted (missing) and OPFS unchanged -> Recreate FS from OPFS
    if (opfsExists && !fsExists && !opfsChanged) {
      // Treat FS deletion as "user removed replica". Recreate from primary OPFS.
      return { type: "EXPORT_TO_FS", path, opfsMetadata: opfs };
    }

    // 8. E) OPFS deleted and FS unchanged -> Delete in FS
    if (!opfsExists && fsExists && !fsChanged) {
      // OPFS is primary. If it's gone, the replica should be destroyed.
      // SAFETY: Never delete critical app directories.
      if (path.startsWith("images/") || path.startsWith(".cache/")) {
        return { type: "SKIP", path };
      }
      return { type: "DELETE_FS", path, registryEntry: registry };
    }

    // 9. Both deleted
    if (!opfsExists && !fsExists) {
      // Just clean up registry later
      return { type: "SKIP", path };
    }

    return { type: "SKIP", path };
  }
}
