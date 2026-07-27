import {
  DelveTopologyGenerator,
  DelveFlowLayout,
  type DelveCanvasDocument,
} from "generator-engine";

export interface DungeonDelveServiceDeps {
  topologyGenerator?: DelveTopologyGenerator;
  flowLayout?: DelveFlowLayout;
}

export class DungeonDelveService {
  private topologyGenerator: DelveTopologyGenerator;
  private flowLayout: DelveFlowLayout;

  constructor(deps: DungeonDelveServiceDeps = {}) {
    this.topologyGenerator =
      deps.topologyGenerator || new DelveTopologyGenerator();
    this.flowLayout = deps.flowLayout || new DelveFlowLayout();
  }

  public buildDelveCanvasFromConcept(
    entity: Record<string, any>,
  ): DelveCanvasDocument {
    const conceptId = entity.id || entity.slug || `dungeon-${Date.now()}`;
    const title = entity.title || entity.name || "Untitled Dungeon";
    const metadata = entity.metadata || {};

    let sectors = Array.isArray(metadata.sectors)
      ? metadata.sectors
      : Array.isArray(entity.sectors)
        ? entity.sectors
        : [];

    if (sectors.length === 0 && typeof entity.content === "string") {
      const parsedSectors: Array<{ id: string; name: string }> = [];
      const matches = entity.content.matchAll(
        /### Sector \d+:\s*(.+?)(?=\n|$)/g,
      );
      let idx = 1;
      for (const m of matches) {
        if (m[1]?.trim()) {
          parsedSectors.push({
            id: `sec-${idx}`,
            name: m[1].trim(),
          });
          idx++;
        }
      }
      if (parsedSectors.length > 0) {
        sectors = parsedSectors;
      }
    }

    const size = metadata.size || entity.size || "medium";
    const factions = metadata.factions || entity.factions;
    const hazards = metadata.hazards || entity.hazards;

    const rawDoc = this.topologyGenerator.generateFromConcept({
      conceptId,
      title,
      size,
      sectors,
      factions,
      hazards,
    });

    return this.flowLayout.applyLayout(rawDoc);
  }
}

export const dungeonDelveService = new DungeonDelveService();
