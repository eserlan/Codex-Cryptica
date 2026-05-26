import { type SyncDirection } from "schema";
import { type SyncEntry, type FileMetadata } from "./types";

export type SyncActionType =
  | "EXPORT_TO_FS" // A) Only OPFS changed, or F) New on OPFS, or D) FS deleted (recreate)
  | "IMPORT_TO_OPFS" // B) Only FS changed, or F) New on FS
  | "DELETE_FS" // E) OPFS deleted and FS unchanged
  | "DELETE_OPFS" // Added for OPFS deletion handling
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
    direction: SyncDirection = "pull", // Default to pull for safety if not provided
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
      // We use a 2-second fuzzy window to handle millisecond-level metadata jitter
      // common in many filesystems and browser I/O implementations.
      const sizeMismatch =
        fsExists &&
        (registry.lastSyncedFsSize === undefined ||
          fs.size !== registry.lastSyncedFsSize);
      const timeMismatch =
        fsExists &&
        (registry.lastSyncedFsModified === undefined ||
          Math.abs(fs.lastModified - registry.lastSyncedFsModified) > 1000);

      fsChanged = !!(fsExists && (sizeMismatch || timeMismatch));
    } else {
      // If there's no registry entry, both are considered "changed" / new
      opfsChanged = !!opfsExists;
      fsChanged = !!fsExists;
    }

    // Optional Validation - Always validate existing files to ensure excluded files are never processed
    if (validator) {
      if (fsExists) {
        const isValid = await validator(path, fs);
        if (!isValid) return { type: "SKIP", path };
      }
      if (opfsExists) {
        const isValid = await validator(path, opfs);
        if (!isValid) return { type: "SKIP", path };
      }
    }

    // --- Decision Table Application ---

    // 1. No Registry Entry (Initial Encounter)
    if (!registry) {
      if (opfsExists && !fsExists) {
        if (direction === "pull") return { type: "SKIP", path };
        return {
          type: "EXPORT_TO_FS",
          path,
          opfsMetadata: opfs,
          registryEntry: registry,
        };
      }
      if (!opfsExists && fsExists) {
        if (direction === "push") return { type: "SKIP", path };
        return {
          type: "IMPORT_TO_OPFS",
          path,
          fsMetadata: fs,
          registryEntry: registry,
        };
      }
      if (opfsExists && fsExists) {
        // Exists in both but no record.
        if (fs.size === opfs.size) {
          return {
            type: "MATCH_INITIAL",
            path,
            fsMetadata: fs,
            opfsMetadata: opfs,
            registryEntry: registry,
          };
        }

        // Directional handling for conflicts on initial encounter
        if (direction === "push") {
          return {
            type: "EXPORT_TO_FS",
            path,
            fsMetadata: fs,
            opfsMetadata: opfs,
            registryEntry: registry,
          };
        } else {
          return {
            type: "IMPORT_TO_OPFS",
            path,
            fsMetadata: fs,
            registryEntry: registry,
          };
        }
      }

      return { type: "SKIP", path };
    }

    // 2. A) Only OPFS changed -> Export to FS
    if (opfsChanged && !fsChanged && opfsExists && fsExists) {
      if (direction === "pull") return { type: "SKIP", path };
      return {
        type: "EXPORT_TO_FS",
        path,
        fsMetadata: fs,
        opfsMetadata: opfs,
        registryEntry: registry,
      };
    }

    // 3. B) Only FS changed -> Import to OPFS
    if (!opfsChanged && fsChanged && opfsExists && fsExists) {
      if (direction === "push") return { type: "SKIP", path };
      return {
        type: "IMPORT_TO_OPFS",
        path,
        fsMetadata: fs,
        registryEntry: registry,
      };
    }

    // 4. C) Both changed -> Conflict. In directional mode, one side "wins".
    if (opfsChanged && fsChanged && opfsExists && fsExists) {
      if (direction === "push") {
        return {
          type: "EXPORT_TO_FS",
          path,
          fsMetadata: fs,
          opfsMetadata: opfs,
          registryEntry: registry,
        };
      } else {
        return {
          type: "IMPORT_TO_OPFS",
          path,
          fsMetadata: fs,
          registryEntry: registry,
        };
      }
    }

    // 5. F) New file on FS (not in manifest) -> Import to OPFS
    if (!opfsExists && fsExists && fsChanged) {
      if (direction === "push") return { type: "SKIP", path };
      return {
        type: "IMPORT_TO_OPFS",
        path,
        fsMetadata: fs,
        registryEntry: registry,
      };
    }

    // 6. G) New file in OPFS (exists in manifest but not in FS) -> Export to FS
    if (opfsExists && !fsExists && opfsChanged) {
      if (direction === "pull") return { type: "SKIP", path };
      return {
        type: "EXPORT_TO_FS",
        path,
        opfsMetadata: opfs,
        registryEntry: registry,
      };
    }

    // 7. D) FS deleted (missing) and OPFS unchanged -> Recreate FS from OPFS
    if (opfsExists && !fsExists && !opfsChanged) {
      if (direction === "pull") return { type: "SKIP", path };
      return {
        type: "EXPORT_TO_FS",
        path,
        opfsMetadata: opfs,
        registryEntry: registry,
      };
    }

    // 8. E) OPFS deleted and FS unchanged -> Delete in FS
    if (!opfsExists && fsExists && !fsChanged) {
      if (direction === "pull") return { type: "SKIP", path };
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
