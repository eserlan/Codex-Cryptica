import type { Entity } from "schema";

type TargetCandidate = Pick<Entity, "id" | "type">;

/**
 * Faction turns act upon parts of the world a faction can influence. Events
 * describe what has already happened, and notes are reference material, so
 * neither is a meaningful target for an Influence action.
 */
export function canTargetWithFactionTurn(
  actingFactionId: string,
  candidate: TargetCandidate,
): boolean {
  return (
    candidate.id !== actingFactionId &&
    candidate.type !== "event" &&
    candidate.type !== "note"
  );
}
