import { vaultEventBus } from "./events";
import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";

export class SearchStore {
  constructor(private serviceRegistry: ServiceRegistry) {
    vaultEventBus.subscribe(async (event) => {
      try {
        if (event.type === "ENTITY_UPDATED") {
          await this.indexEntity(event.entity);
        } else if (event.type === "BATCH_CREATED") {
          for (const entity of event.entities) {
            await this.indexEntity(entity);
          }
        } else if (event.type === "SYNC_CHUNK_READY") {
          for (const id of event.newOrChangedIds) {
            const entity = event.entities[id];
            if (entity) {
              await this.indexEntity(entity);
            }
          }
        } else if (event.type === "ENTITY_DELETED") {
          await this.removeEntity(event.entityId);
        } else if (event.type === "CACHE_LOADED") {
          // Re-index everything from cache
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
          for (const entity of Object.values(event.entities)) {
            await this.indexEntity(entity);
          }
        } else if (event.type === "VAULT_OPENING") {
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
        }
      } catch (err) {
        debugStore.warn("[SearchStore] Event handler failed", err);
      }
    }, "vault-search-store");
  }

  private async indexEntity(entity: LocalEntity) {
    const services = await this.serviceRegistry.ensureInitialized();
    const path = entity._path?.join("/") || `${entity.id}.md`;
    const keywords = [
      ...(entity.tags || []),
      entity.lore || "",
      ...Object.values(entity.metadata || {}).flat(),
    ].join(" ");

    await services.search.index({
      id: entity.id,
      title: entity.title,
      content: entity.content,
      lore: entity.lore,
      type: entity.type,
      path,
      keywords,
      status: entity.status,
      updatedAt: Date.now(),
    });
  }

  private async removeEntity(id: string) {
    const services = await this.serviceRegistry.ensureInitialized();
    await services.search.remove(id);
  }
}
