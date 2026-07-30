import {
  DelveTopologyGenerator,
  DelveFlowLayout,
  type DelveCanvasDocument,
} from "generator-engine";
import { type Clock, systemClock } from "$lib/utils/runtime-deps";

export interface DungeonDelveServiceDeps {
  topologyGenerator?: DelveTopologyGenerator;
  flowLayout?: DelveFlowLayout;
  clock?: Clock;
}

function extractGeneratedSectorNames(narrative: string): string[] {
  const explicitSectors = Array.from(
    narrative.matchAll(/^###\s+Sector\s+\d+\s*:\s*(.+?)\s*$/gim),
    (match) => match[1]?.trim(),
  ).filter((name): name is string => Boolean(name));
  if (explicitSectors.length > 0) return explicitSectors;

  const layoutSection = narrative.match(
    /(?:^|\n)#{2,3}\s+Dungeon Layout\s*\n([\s\S]*?)(?=\n#{2,3}\s+|$)/i,
  )?.[1];
  if (!layoutSection) return [];

  return Array.from(
    layoutSection.matchAll(/^\s*\d+[.)]\s+(.+?)\s*$/gm),
    (match) =>
      match[1]
        ?.trim()
        .replace(/^(\*\*|__)/, "")
        .replace(/(\*\*|__)$/, ""),
  ).filter((name): name is string => Boolean(name));
}

export class DungeonDelveService {
  private topologyGenerator: DelveTopologyGenerator;
  private flowLayout: DelveFlowLayout;
  private clock: Clock;

  constructor(deps: DungeonDelveServiceDeps = {}) {
    this.topologyGenerator =
      deps.topologyGenerator || new DelveTopologyGenerator();
    this.flowLayout = deps.flowLayout || new DelveFlowLayout();
    this.clock = deps.clock || systemClock;
  }

  public buildDelveCanvasFromConcept(
    entity: Record<string, any>,
  ): DelveCanvasDocument {
    const conceptId = entity.id || entity.slug || `dungeon-${this.clock.now()}`;
    const title = entity.title || entity.name || "Untitled Dungeon";
    const metadata = entity.metadata || {};

    let sectors = Array.isArray(metadata.sectors)
      ? metadata.sectors
      : Array.isArray(entity.sectors)
        ? entity.sectors
        : [];

    const generatedNarrative = [entity.content, entity.lore]
      .filter((value): value is string => typeof value === "string")
      .join("\n");

    if (sectors.length === 0 && generatedNarrative) {
      const parsedSectors = extractGeneratedSectorNames(generatedNarrative).map(
        (name, index) => ({
          id: `sec-${index + 1}`,
          name,
        }),
      );
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

    const flowDoc = this.flowLayout.applyLayout(rawDoc);
    (flowDoc as any).metadata = {
      ...((flowDoc as any).metadata || {}),
      sourceEntityId: conceptId,
      kind: "delve",
      autoPopulateAreas: true,
      areaPopulationStatus: "pending",
    };
    return flowDoc;
  }
}

export function isDelveLocationEntity(
  entity: Record<string, any> | null | undefined,
): boolean {
  if (!entity) return false;

  const metadata = entity.metadata || {};
  const kind = entity.kind || metadata.kind;
  const labels = Array.isArray(entity.labels)
    ? entity.labels.map((l: string) => String(l).toLowerCase())
    : [];
  const generatedNarrative = [entity.content, entity.lore]
    .filter((value): value is string => typeof value === "string")
    .join("\n");

  // 1. Explicit generator kind or delve/sector metadata
  if (
    kind === "dungeon" ||
    (Array.isArray(metadata.sectors) && metadata.sectors.length > 0) ||
    metadata.delve
  ) {
    return true;
  }

  // 2. Marked with delve / dungeon / facility / lair / hideout labels AND has sector structure or delve metadata
  const hasDelveLabel = labels.some((l: string) =>
    ["dungeon", "delve", "facility", "lair", "hideout"].includes(l),
  );

  const hasSectorStructure =
    extractGeneratedSectorNames(generatedNarrative).length > 0;

  if (
    hasDelveLabel &&
    (hasSectorStructure || Array.isArray(metadata.sectors))
  ) {
    return true;
  }

  return false;
}

export const dungeonDelveService = new DungeonDelveService();
