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

    // Avoid spreading, flattening, and intermediate arrays for keywords
    const keywordBuffer: string[] = [];

    const labelsOrTags = entity.labels || entity.tags;
    if (labelsOrTags && Array.isArray(labelsOrTags)) {
      for (let i = 0; i < labelsOrTags.length; i++) {
        const tag = labelsOrTags[i];
        if (tag) {
          keywordBuffer.push(tag);
        }
      }
    }

    if (entity.lore) {
      keywordBuffer.push(entity.lore);
    }

    if (entity.metadata && typeof entity.metadata === "object") {
      const vals = Object.values(entity.metadata);
      for (let i = 0; i < vals.length; i++) {
        const val = vals[i];
        if (Array.isArray(val)) {
          for (let j = 0; j < val.length; j++) {
            const innerVal = val[j];
            if (innerVal) {
              keywordBuffer.push(innerVal);
            }
          }
        } else if (val) {
          keywordBuffer.push(typeof val === "string" ? val : String(val));
        }
      }
    }

    const keywords = keywordBuffer.join(" ");
    const aliases =
      entity.aliases && Array.isArray(entity.aliases)
        ? entity.aliases.join(" ")
        : "";

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
