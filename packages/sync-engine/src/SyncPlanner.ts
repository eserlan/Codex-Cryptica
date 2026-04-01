import { DiffAlgorithm, type SyncAction } from "./DiffAlgorithm";
import { type FileMetadata, type SyncEntry } from "./types";
import { SyncRegistry } from "./SyncRegistry";

export class SyncPlanner {
  constructor(
    private registry: SyncRegistry,
    private diffAlgorithm = DiffAlgorithm,
  ) {}

  async plan(
    fsFiles: FileMetadata[],
    opfsScan: { files: FileMetadata[]; nextToken?: string },
    registryEntries: SyncEntry[],
    sinceToken?: string | null,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
    signal?: AbortSignal,
  ): Promise<{ actions: SyncAction[]; nextToken?: string }> {
    if (signal?.aborted) throw new Error("AbortError");

    const opfsFilesById = new Map<string, FileMetadata>();
    const otherOpfsFiles: FileMetadata[] = [];

    for (const f of opfsScan.files) {
      if (typeof f.handle === "string") {
        opfsFilesById.set(f.handle, f);
      } else {
        otherOpfsFiles.push(f);
      }
    }

    const resolvedOpfsFiles = await Promise.all(
      Array.from(opfsFilesById.values()).map(async (f) => {
        if (f.path === "unknown" && typeof f.handle === "string") {
          const entry = await this.registry.getEntryByRemoteId(f.handle);
          if (entry) return { ...f, path: entry.filePath };
        }
        return f;
      }),
    );

    const resolvedFiles = [...resolvedOpfsFiles, ...otherOpfsFiles];
    const fsMap = new Map(fsFiles.map((f) => [f.path, f]));
    const opfsMap = new Map(resolvedFiles.map((f) => [f.path, f]));
    const registryMap = new Map(registryEntries.map((e) => [e.filePath, e]));

    const isDeltaSync = sinceToken !== undefined && sinceToken !== null;
    const allPaths = new Set([
      ...fsMap.keys(),
      ...opfsMap.keys(),
      ...registryMap.keys(),
    ]);

    const actions: SyncAction[] = [];
    for (const path of allPaths) {
      if (signal?.aborted) throw new Error("AbortError");

      let opfsMetadata = opfsMap.get(path);
      const registryEntry = registryMap.get(path);
      const isOpfsDeleted = opfsMetadata?.isDeleted;

      if (
        isDeltaSync &&
        !opfsMetadata &&
        !isOpfsDeleted &&
        registryEntry?.remoteId
      ) {
        opfsMetadata = {
          path,
          lastModified: Date.now(),
          size: registryEntry.lastSyncedFsSize || 0,
          handle: registryEntry.remoteId,
          hash: registryEntry.lastSyncedOpfsHash,
        };
      }

      const action = await this.diffAlgorithm.calculateAction(
        path,
        fsMap.get(path),
        opfsMetadata,
        registryEntry,
        validator,
      );

      if (action.type !== "SKIP") {
        actions.push(action);
      }
    }

    return { actions, nextToken: opfsScan.nextToken };
  }
}
