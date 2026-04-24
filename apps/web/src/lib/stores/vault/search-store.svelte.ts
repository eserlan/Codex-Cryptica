import { vaultEventBus } from "./events";
import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";

const SEARCH_FIELDS = new Set([
  "title",
  "aliases",
  "content",
  "lore",
  "tags",
  "type",
  "status",
  "_path",
]);

const NON_SEARCH_METADATA_FIELDS = new Set(["coordinates", "width", "height"]);

function hasSearchableMetadataChange(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return true;
  }

  return Object.keys(metadata).some(
    (field) => !NON_SEARCH_METADATA_FIELDS.has(field),
  );
}

function shouldIndexPatch(patch: Partial<LocalEntity> | undefined) {
  if (!patch) return true;

  return Object.entries(patch).some(([field, value]) => {
    if (field === "metadata") {
      return hasSearchableMetadataChange(value);
    }
    return SEARCH_FIELDS.has(field);
  });
}

export class SearchStore {
  constructor(private serviceRegistry: ServiceRegistry) {
    const handler = async (event: any) => {
      try {
        if (event.type === "ENTITY_UPDATED") {
          if (!shouldIndexPatch(event.patch)) return;
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
          const toIndex = event.entities.filter((e: any) => {
            const patch = event.patches?.[e.id];
            return shouldIndexPatch(patch);
          });
          if (toIndex.length === 0) return;

          const services = await this.serviceRegistry.ensureInitialized();
          await Promise.all(
            toIndex.map((e: any) => this.indexEntity(e, services)),
          );
        } else if (event.type === "ENTITY_DELETED") {
          await this.removeEntity(event.entityId);
        } else if (event.type === "CACHE_LOADED") {
          const services = await this.serviceRegistry.ensureInitialized();
          await services.search.clear();
          const entities = Object.values(event.entities) as any[];
          const CHUNK_SIZE = 25;
          for (let i = 0; i < entities.length; i += CHUNK_SIZE) {
            await Promise.all(
              entities
                .slice(i, i + CHUNK_SIZE)
                .map((e: any) => this.indexEntity(e, services)),
            );
            // Yield between chunks so the browser can process renders/navigation
            if (i + CHUNK_SIZE < entities.length) {
              await new Promise<void>((r) => setTimeout(r, 0));
            }
          }
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
      aliases: (entity.aliases || []).join(" "),
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
