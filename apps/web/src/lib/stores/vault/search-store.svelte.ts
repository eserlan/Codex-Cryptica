import { vaultEventBus } from "./events";
import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";

export class SearchStore {
  constructor(private serviceRegistry: ServiceRegistry) {
    const handler = async (event: any) => {
      try {
        if (event.type === "ENTITY_UPDATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await this.indexEntity(event.entity, services);
        } else if (event.type === "BATCH_CREATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await Promise.all(
            event.entities.map((e: any) => this.indexEntity(e, services)),
          );
        } else if (event.type === "SYNC_CHUNK_READY") {
          const services = await this.serviceRegistry.ensureInitialized();
          const entities = event.newOrChangedIds
            .map((id: string) => event.entities[id])
            .filter(Boolean);
          await Promise.all(
            entities.map((e: any) => this.indexEntity(e, services)),
          );
        } else if (event.type === "BATCH_UPDATED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await Promise.all(
            event.entities.map((e: any) => this.indexEntity(e, services)),
          );
        } else if (event.type === "ENTITY_DELETED") {
          await this.removeEntity(event.entityId);
        } else if (event.type === "CACHE_LOADED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
          await Promise.all(
            Object.values(event.entities).map((e: any) =>
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
    };

    if (vaultEventBus) {
      vaultEventBus.subscribe(handler, "vault-search-store");
    } else {
      void import("./events").then(({ vaultEventBus: bus }) => {
        if (bus) {
          bus.subscribe(handler, "vault-search-store");
        }
      });
    }
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
