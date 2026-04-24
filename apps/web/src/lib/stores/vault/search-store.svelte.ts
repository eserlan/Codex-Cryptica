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
          // ⚡ Bolt Optimization: Replace chained .map().filter() with an imperative loop
          const entities: LocalEntity[] = [];
          for (let i = 0; i < event.newOrChangedIds.length; i++) {
            const entity = event.entities[event.newOrChangedIds[i]];
            if (entity) {
              entities.push(entity);
            }
          }
          await Promise.all(entities.map((e) => this.indexEntity(e, services)));
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
          await Promise.all(
            Object.values(event.entities).map((e) =>
              this.indexEntity(e, services),
            ),
          );
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
