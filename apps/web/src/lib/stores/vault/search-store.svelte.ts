import { vaultEventBus } from "./events";
import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";

export class SearchStore {
  constructor(private serviceRegistry: ServiceRegistry) {
    vaultEventBus.subscribe(async (event) => {
      try {
        if (event.type === "ENTITY_UPDATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await this.indexEntity(event.entity, services);
        } else if (event.type === "BATCH_CREATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await Promise.all(
            event.entities.map((e) => this.indexEntity(e, services)),
          );
        } else if (event.type === "SYNC_CHUNK_READY") {
          const services = await this.serviceRegistry.ensureInitialized();
          // ⚡ Bolt Optimization: Replace chained .map().filter().map() with a single imperative loop.
          const promises = [];
          for (const id of event.newOrChangedIds) {
            const entity = event.entities[id];
            if (entity) promises.push(this.indexEntity(entity, services));
          }
          await Promise.all(promises);
        } else if (event.type === "BATCH_UPDATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await Promise.all(
            event.entities.map((e) => this.indexEntity(e, services)),
          );
        } else if (event.type === "ENTITY_DELETED") {
          await this.removeEntity(event.entityId);
        } else if (event.type === "CACHE_LOADED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
          // ⚡ Bolt Optimization: Replace Object.values().map() with an imperative loop
          // to avoid allocating two large intermediate arrays.
          const promises = [];
          for (const key in event.entities) {
            promises.push(this.indexEntity(event.entities[key], services));
          }
          await Promise.all(promises);
        } else if (event.type === "VAULT_OPENING") {
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
        }
      } catch (err) {
        debugStore.warn("[SearchStore] Event handler failed", err);
      }
    }, "vault-search-store");
  }

  private async indexEntity(entity: LocalEntity, services: any) {
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
