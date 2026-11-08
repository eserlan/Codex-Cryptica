import type { VaultRepository } from "@codex/vault-engine";
import type { PerformanceRecorder } from "@codex/performance-observability";
import type { EntityPersistenceService } from "./entity-persistence";
import type { EntityContentLoader } from "./entity-content-loader.svelte";
import type { IVaultServices } from "./service-registry";
import type { LocalEntity } from "./types";

export interface MutationDependencies {
  performanceRecorder?: PerformanceRecorder;
  repository: VaultRepository;
  persistence: EntityPersistenceService;
  loader: EntityContentLoader;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  invalidateUrlCache?: (path: string) => void;
  getServices: () => IVaultServices | null;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  onEntitiesUpdated?: (
    oldEntities: Record<string, LocalEntity>,
    newEntities: Record<string, LocalEntity>,
  ) => void;
  onConnectionAdded?: (
    sourceId: string,
    targetId: string,
    connection: any,
  ) => void;
  onConnectionRemoved?: (
    sourceId: string,
    targetId: string,
    connectionType: string,
  ) => void;
  onConnectionUpdated?: (
    sourceId: string,
    targetId: string,
    oldType: string,
    connection: any,
  ) => void;
  getInboundConnections?: () => Record<
    string,
    { sourceId: string; connection: any }[]
  >;
  getParentToChildren?: () => Record<string, string[]>;
}

/** Live facade state: services observe callback replacements and repository changes. */
export interface EntityMutationContext {
  deps: MutationDependencies;
  entities: Record<string, LocalEntity>;
}
