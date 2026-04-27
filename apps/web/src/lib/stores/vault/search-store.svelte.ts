import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";

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
