import { type ISyncBackend, type SyncResult, type FileMetadata } from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { SyncPlanner } from "./SyncPlanner";
import { type SyncAction } from "./DiffAlgorithm";
import { SyncContentComparator } from "./SyncContentComparator";
import { SyncPersistence } from "./SyncPersistence";
import {
  SyncActionExecutor,
  type SyncExecutionContext,
} from "./SyncActionExecutor";

export type SyncServiceDependencies = {
  planner?: SyncPlanner;
  comparator?: SyncContentComparator;
  persistence?: SyncPersistence;
  executor?: SyncActionExecutor;
};

export class SyncService {
  private readonly planner: SyncPlanner;
  private readonly comparator: SyncContentComparator;
  private readonly persistence: SyncPersistence;
  private readonly executor: SyncActionExecutor;

  constructor(
    protected registry: SyncRegistry,
    deps: SyncServiceDependencies = {},
  ) {
    this.comparator = deps.comparator ?? new SyncContentComparator();
    this.persistence = deps.persistence ?? new SyncPersistence(registry);
    this.planner = deps.planner ?? new SyncPlanner(registry);
    this.executor =
      deps.executor ??
      new SyncActionExecutor(registry, this.comparator, this.persistence);
  }

  private getTs() {
    return new Date().toISOString().split("T")[1].split("Z")[0];
  }

  async sync(
    vaultId: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    sinceToken?: string | null,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
    onProgress?: (stats: {
      updated: number;
      created: number;
      deleted: number;
      failed: number;
      total: number;
    }) => void,
    signal?: AbortSignal,
  ): Promise<SyncResult & { nextToken?: string }> {
    if (signal?.aborted) throw new Error("AbortError");

    const result: SyncResult & { nextToken?: string } = {
      updated: [],
      created: [],
      deleted: [],
      conflicts: [],
      failed: [],
    };

    try {
      console.log(
        `[${this.getTs()}] [Sync] Starting sync for vault: ${vaultId}`,
      );

      const fsScan = await fsBackend.scan(vaultId);
      if (signal?.aborted) throw new Error("AbortError");
      console.log(
        `[${this.getTs()}] [Sync] FS Scan complete: ${fsScan.files.length} files found.`,
      );

      const opfsScan = await opfsBackend.scan(vaultId, sinceToken);
      if (signal?.aborted) throw new Error("AbortError");
      console.log(
        `[${this.getTs()}] [Sync] OPFS Scan complete: ${opfsScan.files.length} files found.`,
      );

      const registryEntries = await this.registry.getEntriesByVault(vaultId);
      if (signal?.aborted) throw new Error("AbortError");
      console.log(
        `[${this.getTs()}] [Sync] Registry loaded: ${registryEntries.length} entries.`,
      );

      const { actions, nextToken } = await this.planner.plan(
        fsScan.files,
        opfsScan,
        registryEntries,
        sinceToken,
        validator,
        signal,
      );

      result.nextToken = nextToken;

      console.log(
        `[${this.getTs()}] [Sync] Identified ${actions.length} actions:`,
      );
      const actionCounts = actions.reduce(
        (acc, action) => {
          acc[action.type] = (acc[action.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      Object.entries(actionCounts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      const totalActions = actions.length;
      const updateProgress = () => {
        onProgress?.({
          updated: result.updated.length,
          created: result.created.length,
          deleted: result.deleted.length,
          failed: result.failed.length,
          total: totalActions,
        });
      };

      const CONCURRENCY = 1; // Strict sequential for reliability on large local vaults
      let nextActionIndex = 0;
      const context: SyncExecutionContext = {
        vaultId,
        fsBackend,
        opfsBackend,
        signal,
      };

      await Promise.all(
        Array.from({ length: CONCURRENCY }).map(async () => {
          while (nextActionIndex < actions.length) {
            if (signal?.aborted) throw new Error("AbortError");
            const action = actions[nextActionIndex++];
            if (!action) continue;
            try {
              await this.executor.execute(action, context, result);
            } catch (err: any) {
              if (err.message === "AbortError") throw err;
              console.error(
                `[${this.getTs()}] [Sync] Failed ${action.type} for ${action.path}: ${err.message}`,
              );
              result.failed.push({ path: action.path, error: err.message });
            } finally {
              updateProgress();
            }
          }
        }),
      );

      if (sinceToken === undefined || sinceToken === null) {
        const fsMap = new Map(fsScan.files.map((f) => [f.path, f]));
        const opfsMap = new Map(opfsScan.files.map((f) => [f.path, f]));
        const registryMap = new Map(
          registryEntries.map((e) => [e.filePath, e]),
        );

        const BATCH_SIZE = 50;
        let deletePromises: Promise<void>[] = [];
        for (const path of registryMap.keys()) {
          if (signal?.aborted) throw new Error("AbortError");
          if (!fsMap.has(path) && !opfsMap.has(path)) {
            deletePromises.push(this.registry.deleteEntry(vaultId, path));
            if (deletePromises.length >= BATCH_SIZE) {
              await Promise.all(deletePromises);
              deletePromises = [];
            }
          }
        }
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }

      console.log(
        `[${this.getTs()}] [Sync] Sync complete for ${vaultId}. Result:`,
        {
          created: result.created.length,
          updated: result.updated.length,
          deleted: result.deleted.length,
          conflicts: result.conflicts.length,
          failed: result.failed.length,
        },
      );
    } catch (e: any) {
      console.error(
        `[${this.getTs()}] [Sync] Critical error during sync for ${vaultId}:`,
        e.message,
      );
      result.error = e.message;
    }

    return result;
  }

  protected async executeAction(
    action: SyncAction,
    vaultId: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    result: SyncResult,
    signal?: AbortSignal,
  ) {
    await this.executor.execute(
      action,
      { vaultId, fsBackend, opfsBackend, signal },
      result,
    );
  }

  protected async compareContent(
    path: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    fsMetadata?: FileMetadata,
    opfsMetadata?: FileMetadata,
    opfsBlob?: Blob,
    fsBlob?: Blob,
    signal?: AbortSignal,
  ): Promise<boolean> {
    return this.comparator.compareContent(
      path,
      fsBackend,
      opfsBackend,
      fsMetadata,
      opfsMetadata,
      opfsBlob,
      fsBlob,
      signal,
    );
  }
}
