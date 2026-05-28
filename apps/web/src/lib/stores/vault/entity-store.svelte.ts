import * as vaultRelationships from "./relationships";
import type { LocalEntity, BatchCreateInput } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { InboundMap } from "./relationships";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistenceService } from "./entity-persistence";
import { EntityMutationService } from "./entity-mutations";

export interface EntityStoreDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getGuestFile?: (path: string) => Promise<Blob>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getServices: () => any;
  invalidateUrlCache?: (path: string) => void;
  setStatus: (
    status:
      | "idle"
      | "loading"
      | "saving"
      | "saved"
      | "needs-permission"
      | "error",
  ) => void;
  status: () =>
    | "idle"
    | "loading"
    | "saving"
    | "saved"
    | "needs-permission"
    | "error";
  setErrorMessage: (msg: string | null) => void;
  // callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
}

export class EntityStore {
  private repository: VaultRepository;
  public loader: EntityContentLoader;
  private persistence: EntityPersistenceService;
  private mutations: EntityMutationService;

  get entities() {
    return this.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    this.repository.entities = val;
  }

  allEntities: LocalEntity[];
  allActiveEntities: LocalEntity[];
  inboundConnections: InboundMap = $state({});
  titleAliasIndex: Map<string, string>;
  parentToChildren: Map<string, Set<string>>;
  labelData: { index: string[]; counts: Record<string, number> };

  get labelIndex() {
    return this.labelData.index;
  }

  get labelCounts() {
    return this.labelData.counts;
  }

  constructor(
    depsOrRepository: EntityStoreDependencies | VaultRepository,
    loader?: EntityContentLoader,
    persistence?: EntityPersistenceService,
    mutations?: EntityMutationService,
  ) {
    // Determine if we are in the DI path by checking for the presence of the extra args.
    // We check for loader OR persistence OR mutations to decide we're TRYING to use DI.
    if (
      loader ||
      persistence ||
      mutations ||
      (depsOrRepository &&
        "entities" in depsOrRepository &&
        !("activeVaultId" in depsOrRepository))
    ) {
      if (!loader || !persistence || !mutations) {
        const missing = [
          !loader ? "loader" : null,
          !persistence ? "persistence" : null,
          !mutations ? "mutations" : null,
        ].filter(Boolean);

        throw new Error(
          `EntityStore requires ${missing.join(", ")} when using the Dependency Injection constructor. Pass loader, persistence, and mutations, or use the EntityStoreDependencies object form.`,
        );
      }
      this.repository = depsOrRepository as VaultRepository;
      this.loader = loader;
      this.persistence = persistence;
      this.mutations = mutations;
    } else {
      const deps = depsOrRepository as EntityStoreDependencies;
      this.repository = deps.repository;
      this.loader = new EntityContentLoader({
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getGuestFile: deps.getGuestFile,
        getActiveVaultHandle: deps.getActiveVaultHandle,
        getActiveFolderHandle: deps.getActiveFolderHandle,
      });

      this.persistence = new EntityPersistenceService({
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getSpecificVaultHandle: deps.getSpecificVaultHandle,
        setStatus: deps.setStatus,
        status: deps.status,
        setErrorMessage: deps.setErrorMessage,
        onEntityUpdate: deps.onEntityUpdate,
        isContentLoaded: (id) => this.loader.isContentLoaded(id),
        loadContent: (id) => this.loader.internalLoadContent(id),
        markContentLoaded: (id) => this.loader.markContentLoaded(id),
      });

      this.mutations = new EntityMutationService({
        repository: deps.repository,
        persistence: this.persistence,
        loader: this.loader,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getActiveVaultHandle: deps.getActiveVaultHandle,
        getActiveFolderHandle: deps.getActiveFolderHandle,
        getServices: deps.getServices,
        invalidateUrlCache: deps.invalidateUrlCache,
        onEntityDelete: deps.onEntityDelete,
        onBatchUpdate: deps.onBatchUpdate,
        updateEntityCount: deps.updateEntityCount,
        getInboundMap: () => this.inboundConnections,
        getParentToChildren: () => this.parentToChildren,
      });
    }

    this.allEntities = $derived.by(() => Object.values(this.entities));
    this.allActiveEntities = $derived.by(() =>
      this.allEntities.filter((e) => e.status !== "draft"),
    );

    this.titleAliasIndex = $derived.by(() => {
      const index = new Map<string, string>();
      for (const entity of this.allActiveEntities) {
        index.set(entity.title.toLowerCase(), entity.id);
        if (entity.aliases) {
          for (const alias of entity.aliases) {
            index.set(alias.toLowerCase(), entity.id);
          }
        }
      }
      return index;
    });

    this.parentToChildren = $derived.by(() => {
      const map = new Map<string, Set<string>>();
      for (const entity of this.allEntities) {
        if (entity.parent) {
          if (!map.has(entity.parent)) {
            map.set(entity.parent, new Set());
          }
          map.get(entity.parent)!.add(entity.id);
        }
      }
      return map;
    });

    this.labelData = $derived.by(() => {
      const index = new Set<string>();
      const counts: Record<string, number> = {};
      for (const entity of this.allActiveEntities) {
        if (entity.labels) {
          const uniqueLabels = new Set(entity.labels);
          for (const l of uniqueLabels) {
            index.add(l);
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }
      return { index: Array.from(index).sort(), counts };
    });

    import("./events.svelte").then(({ vaultEventBus }) => {
      vaultEventBus.subscribe((event) => {
        if (event.type === "CACHE_LOADED" || event.type === "SYNC_COMPLETE") {
          this.inboundConnections = vaultRelationships.rebuildInboundMap(
            this.entities,
          );
        } else if (event.type === "CONNECTION_ADDED") {
          const { sourceId, targetId, connectionType, label, strength } = event;
          if (!this.inboundConnections[targetId]) {
            this.inboundConnections[targetId] = [];
          }
          this.inboundConnections[targetId].push({
            sourceId,
            connection: {
              target: targetId,
              type: connectionType,
              label: label,
              strength: strength !== undefined ? strength : 1.0,
            },
          });
        } else if (event.type === "CONNECTION_UPDATED") {
          const { sourceId, targetId, oldType, newType, newLabel } = event;
          const targetInbound = this.inboundConnections[targetId];
          if (targetInbound) {
            const idx = targetInbound.findIndex(
              (c) => c.sourceId === sourceId && c.connection.type === oldType,
            );
            if (idx !== -1) {
              targetInbound[idx].connection.type = newType;
              if (newLabel !== undefined) {
                targetInbound[idx].connection.label = newLabel;
              }
            }
          }
        } else if (event.type === "CONNECTION_REMOVED") {
          const { sourceId, targetId, connectionType } = event;
          const targetInbound = this.inboundConnections[targetId];
          if (targetInbound) {
            this.inboundConnections[targetId] = targetInbound.filter(
              (c) =>
                !(
                  c.sourceId === sourceId &&
                  c.connection.type === connectionType
                ),
            );
          }
        } else if (event.type === "ENTITY_DELETED") {
          const { entityId } = event;
          delete this.inboundConnections[entityId];
          for (const targetId in this.inboundConnections) {
            const arr = this.inboundConnections[targetId];
            if (arr.some((c) => c.sourceId === entityId)) {
              this.inboundConnections[targetId] = arr.filter(
                (c) => c.sourceId !== entityId,
              );
            }
          }
        }
      });
    });
  }

  // --- Persistence Delegation ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    return this.persistence.scheduleSave(entity);
  }

  async flushPendingSaves(timeoutMs?: number): Promise<void> {
    return this.persistence.flushPendingSaves(timeoutMs);
  }

  // --- Loader Delegation ---

  async loadEntityContent(id: string): Promise<void> {
    return this.loader.loadEntityContent(id);
  }

  async internalLoadContent(id: string): Promise<void> {
    return this.loader.internalLoadContent(id);
  }

  isContentLoaded(id: string) {
    return this.loader.isContentLoaded(id);
  }

  isContentVerified(id: string) {
    return this.loader.isContentVerified(id);
  }

  markContentLoaded(id: string) {
    this.loader.markContentLoaded(id);
  }

  // --- Mutation Delegation ---

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    return this.mutations.createEntity(type, title, initialData);
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    return this.mutations.updateEntity(id, updates);
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    return this.mutations.batchUpdate(updates);
  }

  async deleteEntity(id: string) {
    return this.mutations.deleteEntity(id);
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    return this.mutations.addConnection(
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
    return this.mutations.updateConnection(
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    return this.mutations.removeConnection(sourceId, targetId, type);
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    return this.mutations.addLabel(id, label);
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    return this.mutations.removeLabel(id, label);
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    return this.mutations.bulkAddLabel(ids, label);
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    return this.mutations.bulkRemoveLabel(ids, label);
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    return this.mutations.batchCreateEntities(newEntitiesList);
  }
}
