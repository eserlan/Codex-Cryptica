import { ServiceRegistry } from "./service-registry";
import type { LocalEntity } from "./types";
import {
  buildSearchAliases,
  buildSearchKeywords,
} from "@codex/search-orchestrator";

export class SearchStore {
  constructor(private _serviceRegistry: ServiceRegistry) {
    // Note: Vault event handling (opening, loading, syncing) is managed by
    // the canonical searchService in lib/services/search.ts to ensure
    // consistent index persistence and worker lifecycle management.
  }

  private async indexEntity(entity: LocalEntity, services: any) {
    const path = entity._path?.join("/") || `${entity.id}.md`;
    const keywords = buildSearchKeywords(entity);
    const aliases = buildSearchAliases(entity);

    await services.search.index({
      id: entity.id,
      title: entity.title,
      aliases,
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
