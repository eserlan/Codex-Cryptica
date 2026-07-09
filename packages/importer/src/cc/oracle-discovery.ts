import type {
  CCImportPackage,
  EntityDraft,
  RelationshipDraft,
} from "./package";
import type { DiscoveredEntity } from "../types";

/**
 * Converts AI-discovered entities (from OracleAnalyzer) into a CCImportPackage
 * so they flow through the same generic preview/decision/commit/report
 * pipeline as every other adapter (Scabard, Chronica), instead of a bespoke
 * review UI.
 *
 * Image/thumbnail fields are passed through as-is — resolving local blob
 * assets to real vault paths is a side effect the caller must do beforehand,
 * since this converter stays a pure function.
 */
export function discoveredEntitiesToPackage(
  entities: DiscoveredEntity[],
  sourceLabel: string,
): CCImportPackage {
  // Titles shared by more than one entity are ambiguous — skip relationship
  // resolution for them rather than silently linking to whichever entity
  // happened to be seen last.
  const titleToSourceId = new Map<string, string>();
  const ambiguousTitles = new Set<string>();
  for (const entity of entities) {
    const key = entity.suggestedTitle.toLowerCase().trim();
    if (titleToSourceId.has(key)) {
      ambiguousTitles.add(key);
    } else {
      titleToSourceId.set(key, entity.id);
    }
  }

  const entityDrafts: EntityDraft[] = entities.map((entity) => {
    const { image, thumbnail, labels, width, height, ...restFrontmatter } =
      entity.frontmatter || {};

    const metadata: Record<string, unknown> = { ...restFrontmatter };
    if (typeof width === "number") metadata.width = width;
    if (typeof height === "number") metadata.height = height;

    return {
      sourceId: entity.id,
      sourceType: entity.suggestedType,
      title: entity.suggestedTitle,
      content: entity.chronicle || entity.content || "",
      lore: entity.lore || undefined,
      tags: [],
      labels: Array.isArray(labels) ? labels : [],
      image: typeof image === "string" ? image : undefined,
      thumbnail: typeof thumbnail === "string" ? thumbnail : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  });

  const relationshipDrafts: RelationshipDraft[] = [];
  for (const entity of entities) {
    for (const link of entity.detectedLinks || []) {
      const target = typeof link === "string" ? link : link.target;
      const label = typeof link === "string" ? undefined : link.label;
      if (!target) continue;

      const targetKey = target.toLowerCase().trim();
      if (ambiguousTitles.has(targetKey)) continue;

      const targetId = titleToSourceId.get(targetKey);
      if (!targetId || targetId === entity.id) continue;

      relationshipDrafts.push({
        fromRef: entity.id,
        toRef: targetId,
        type: "related_to",
        label,
      });
    }
  }

  return {
    version: "1.0",
    sourceSystem: "oracle",
    sourceLabel,
    entityDrafts,
    relationshipDrafts,
    assetDrafts: [],
    warnings: [],
  };
}
