import type { VaultSyncContext } from "./sync-context";
import type { LoadFilesOptions } from "./sync-types";

/** Loads secondary registries either in order or without blocking entity readiness. */
export class VaultSyncAuxiliary {
  constructor(
    private context: VaultSyncContext,
    private scanConflicts: (signal?: AbortSignal) => Promise<void>,
  ) {}

  private get deps() {
    return this.context.deps;
  }

  dispatch(
    vaultId: string,
    vaultDir: FileSystemDirectoryHandle | null,
    signal: AbortSignal,
    onDegraded?: (source: string) => void,
    options: {
      includeEntityCount?: boolean;
      entityCount?: number;
      includePublishRegistry?: boolean;
    } = {},
  ): void {
    const runTask = (
      source: string,
      task: () => Promise<unknown>,
    ): Promise<void> =>
      Promise.resolve()
        .then(task)
        .then(
          () => undefined,
          () => {
            onDegraded?.(source);
          },
        );

    const tasks: Promise<void>[] = [
      runTask("maps", () => this.deps.loadMaps(vaultId)),
      runTask("canvases", () => this.deps.loadCanvases(vaultId)),
      runTask("conflict_scan", () => this.scanConflicts(signal)),
    ];

    if (options.includeEntityCount) {
      const count =
        options.entityCount ??
        Object.keys(this.deps.repository.entities).length;
      tasks.push(
        runTask("entity_count", () =>
          this.deps.updateEntityCount(vaultId, count),
        ),
      );
    }

    if (
      options.includePublishRegistry &&
      vaultDir &&
      this.deps.loadPublishRegistry
    ) {
      const loadPub = this.deps.loadPublishRegistry;
      tasks.push(runTask("publish_registry", () => loadPub(vaultId, vaultDir)));
    }

    void Promise.allSettled(tasks);
  }

  async loadWarm(
    vaultId: string,
    count: number,
    signal: AbortSignal,
    options: LoadFilesOptions,
  ) {
    if (options.deferAuxiliary) {
      this.dispatch(vaultId, null, signal, options.onAuxiliaryDegraded, {
        includeEntityCount: true,
        entityCount: count,
        includePublishRegistry: false,
      });
    } else {
      await this.deps.updateEntityCount(vaultId, count);
      await this.deps.loadMaps(vaultId);
      await this.deps.loadCanvases(vaultId);
      void this.deps.getActiveVaultHandle();
    }
  }

  async loadAfterParse(vaultId: string, vaultDir: FileSystemDirectoryHandle) {
    await Promise.all([
      this.deps.loadMaps(vaultId),
      this.deps.loadCanvases(vaultId),
      this.deps.loadPublishRegistry
        ? this.deps.loadPublishRegistry(vaultId, vaultDir)
        : Promise.resolve(),
    ]);
  }
}
