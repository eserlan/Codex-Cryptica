import type {
  ContextualRecommendation,
  IntentCategory,
} from "generator-engine";

/** Minimal shape the recommendation engine needs — decoupled from the full
 * vault `LocalEntity` type so it stays a pure, easily-testable function. */
export interface RecommendableEntity {
  id: string;
  type: string;
  title: string;
  connections: Array<{ target: string; type: string; label?: string }>;
}

const LEADER_KEYWORDS = ["lead", "leader", "leads", "rules", "ruler"];
const LOCATED_IN_KEYWORDS = ["located_in", "located in", "based in", "part_of"];

function connectionMatchesAny(
  connection: { type: string; label?: string },
  keywords: string[],
): boolean {
  const haystack = `${connection.type} ${connection.label ?? ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function hasLeader(
  entity: RecommendableEntity,
  allEntities: Record<string, RecommendableEntity>,
): boolean {
  return entity.connections.some((c) => {
    if (!connectionMatchesAny(c, LEADER_KEYWORDS)) return false;
    return allEntities[c.target]?.type === "character";
  });
}

function isChildLocation(entity: RecommendableEntity): boolean {
  return entity.connections.some((c) =>
    connectionMatchesAny(c, LOCATED_IN_KEYWORDS),
  );
}

function hasChildSettlement(
  entity: RecommendableEntity,
  allEntities: Record<string, RecommendableEntity>,
): boolean {
  return Object.values(allEntities).some((other) => {
    if (other.id === entity.id || other.type !== "location") return false;
    return other.connections.some(
      (c) =>
        c.target === entity.id && connectionMatchesAny(c, LOCATED_IN_KEYWORDS),
    );
  });
}

/**
 * Deterministic, AI-free structural recommendation heuristics (#1909, FR-014).
 * Pure and sub-millisecond by design — no LLM calls, no I/O.
 */
export function evaluateEntityRecommendations(
  entity: RecommendableEntity,
  allEntities: Record<string, RecommendableEntity>,
): ContextualRecommendation[] {
  const recommendations: ContextualRecommendation[] = [];

  if (entity.type === "faction" && !hasLeader(entity, allEntities)) {
    recommendations.push({
      id: `${entity.id}:leader`,
      parentEntityId: entity.id,
      promptText: `Who leads ${entity.title}?`,
      targetCategory: "character" as IntentCategory,
      relationType: "leader",
      actionLabel: "Add Leader",
    });
  }

  if (
    entity.type === "location" &&
    !isChildLocation(entity) &&
    !hasChildSettlement(entity, allEntities)
  ) {
    recommendations.push({
      id: `${entity.id}:settlement`,
      parentEntityId: entity.id,
      promptText: `Add a settlement to ${entity.title}?`,
      targetCategory: "place" as IntentCategory,
      relationType: "settlement",
      actionLabel: "Add Settlement",
    });
  }

  if (entity.type === "threat" && entity.connections.length === 0) {
    recommendations.push({
      id: `${entity.id}:response`,
      parentEntityId: entity.id,
      promptText: `Who will respond to ${entity.title}?`,
      targetCategory: "character" as IntentCategory,
      relationType: "responder",
      actionLabel: "Add Character",
    });
  }

  return recommendations;
}
