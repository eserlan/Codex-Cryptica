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
  constructor(private _serviceRegistry: ServiceRegistry) {
    // Note: Vault event handling (opening, loading, syncing) is managed by 
    // the canonical searchService in lib/services/search.ts to ensure 
    // consistent index persistence and worker lifecycle management.
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
    const services = await this._serviceRegistry.ensureInitialized();
    await services.search.remove(id);
  }
}
