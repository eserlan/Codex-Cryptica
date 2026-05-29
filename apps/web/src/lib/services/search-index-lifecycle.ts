import { VAULT_EVENTS } from "@codex/vault-engine";
import { appEventBus } from "@codex/events";
import type { SearchProgressCoordinator } from "./search-progress-coordinator";
import { BATCH_UPDATED_SEARCH_FIELDS } from "./search-index-pipeline.svelte";

export type LifecycleCallbacks = {
  onVaultSwitch(vaultId: string): Promise<void>;
  onCacheLoaded(vaultId: string, entities: unknown[]): Promise<void>;
  onSyncChunk(entities: unknown[]): Promise<void>;
  onSyncComplete(vaultId: string): Promise<void>;
  onEntityUpdated(entity: unknown, patch: unknown): Promise<void>;
  onEntityDeleted(entityId: string): Promise<void>;
  onBatchCreated(entities: unknown[]): Promise<void>;
  onBatchUpdated(entities: unknown[]): Promise<void>;
  onVisibilityHide(): void;
};

export interface SearchIndexLifecycleDeps {
  eventBus: typeof appEventBus;
  coordinator: SearchProgressCoordinator;
  callbacks: LifecycleCallbacks;
  windowRef?: Window;
  documentRef?: Document;
}

export class SearchIndexLifecycle {
  private eventBus: typeof appEventBus;
  private coordinator: SearchProgressCoordinator;
  private callbacks: LifecycleCallbacks;
  private windowRef: Window | undefined;
  private documentRef: Document | undefined;

  constructor(deps: SearchIndexLifecycleDeps) {
    this.eventBus = deps.eventBus;
    this.coordinator = deps.coordinator;
    this.callbacks = deps.callbacks;
    this.windowRef = deps.windowRef;
    this.documentRef = deps.documentRef;

    if (!this.windowRef) return;

    this.windowRef.addEventListener("visibilitychange", () => {
      if (this.documentRef?.visibilityState === "hidden") {
        this.callbacks.onVisibilityHide();
      }
    });

    this.eventBus.subscribe(
      "VAULT:*",
      async (event: any) => {
        // VALIDATION: All sync/load events MUST match the current active vault ID
        // to prevent cross-vault index contamination during rapid switches.
        // VAULT_OPENING and VAULT_SWITCHED are exempt — they drive the transition.
        const vaultId = event.metadata.vaultId;
        if (
          vaultId &&
          vaultId !== this.coordinator.activeVaultId &&
          event.type !== VAULT_EVENTS.VAULT_OPENING &&
          event.type !== VAULT_EVENTS.VAULT_SWITCHED
        ) {
          return;
        }

        switch (event.type) {
          case VAULT_EVENTS.VAULT_OPENING:
            if (this.coordinator.activeVaultId !== vaultId) {
              await this.callbacks.onVaultSwitch(vaultId!);
            }
            break;

          case VAULT_EVENTS.CACHE_LOADED:
            await this.callbacks.onCacheLoaded(
              vaultId!,
              this.normalizeEntities(event.payload.entities),
            );
            break;

          case VAULT_EVENTS.SYNC_CHUNK_READY: {
            const entities = this.normalizeEntities(event.payload.entities);
            if (entities.length > 0) {
              await this.callbacks.onSyncChunk(entities);
            }
            break;
          }

          case VAULT_EVENTS.SYNC_COMPLETE:
            await this.callbacks.onSyncComplete(vaultId!);
            break;

          case VAULT_EVENTS.VAULT_SWITCHED:
            // Fallback: sync activeVaultId if VAULT_OPENING was missed
            if (this.coordinator.activeVaultId !== event.payload.id) {
              await this.callbacks.onVaultSwitch(event.payload.id);
            }
            break;

          case VAULT_EVENTS.ENTITY_UPDATED: {
            const { patch, entity } = event.payload;
            await this.callbacks.onEntityUpdated(entity, patch);
            break;
          }

          case VAULT_EVENTS.ENTITY_DELETED:
            await this.callbacks.onEntityDeleted(event.payload.entityId);
            break;

          case VAULT_EVENTS.BATCH_CREATED:
            await this.callbacks.onBatchCreated(
              this.normalizeEntities(event.payload.entities),
            );
            break;

          case VAULT_EVENTS.BATCH_UPDATED: {
            const entities = this.normalizeEntities(event.payload.entities);
            if (entities.length === 0) break;
            // Skip re-indexing when only non-search fields changed.
            const patches: Record<string, Record<string, unknown>> = event
              .payload.patches ?? {};
            const entitiesToIndex = entities.filter((e: any) => {
              const patch = patches[e.id];
              if (!patch) return true;
              return Object.keys(patch).some((k) =>
                BATCH_UPDATED_SEARCH_FIELDS.has(k),
              );
            });
            if (entitiesToIndex.length > 0) {
              await this.callbacks.onBatchUpdated(entitiesToIndex);
            }
            break;
          }
        }
      },
      "search-service",
    );
  }

  private normalizeEntities(entities: unknown): unknown[] {
    if (Array.isArray(entities)) return entities;
    if (entities && typeof entities === "object")
      return Object.values(entities);
    return [];
  }
}
