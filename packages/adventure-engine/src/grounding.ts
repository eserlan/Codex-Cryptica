/** Maximum number of distinct source records hydrated for one interaction. */
export const MAX_GROUNDING_RECORDS = 24;

/** Select required sources first, without reading optional duplicates. */
export function selectGroundingCandidates(
  requiredIds: readonly string[],
  relevantIds: readonly string[],
): string[] {
  const required = [...new Set(requiredIds)];
  if (required.length > MAX_GROUNDING_RECORDS) {
    throw new Error("grounding-anchor-budget-exceeded");
  }
  return [...new Set([...required, ...relevantIds])].slice(
    0,
    MAX_GROUNDING_RECORDS,
  );
}

import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SourceRecordReference,
} from "./types";

export type GroundingFailureCode = "lookup" | "unavailable" | "budget";

export type GroundingPurpose =
  "opening" | "action" | "roll-resolution" | "background";
export interface GroundingIntent {
  session: AdventureSession;
  purpose: GroundingPurpose;
  playerAction?: string;
}
export interface GroundingContext {
  vaultId: string;
  sessionId: string;
  revision: number;
  purpose: GroundingPurpose;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  /** Structured session state; contains labelled GM-only material. */
  sessionKnowledge: string;
}

/** Explicit canonical choices remain required even in legacy source lists. */
export function requiredGroundingSources(
  session: AdventureSession,
): SourceRecordReference[] {
  const references = [...session.sourceRecords];
  if (session.playerCharacter.kind === "canonical") {
    references.unshift({
      recordId: session.playerCharacter.recordId,
      role: "player-character",
      recordType: "character",
      availability: "available",
      displayName: session.playerCharacter.name,
    });
  }
  if (session.worldEntry?.location.kind === "canonical") {
    references.push({
      recordId: session.worldEntry.location.recordId,
      role: "anchor",
      recordType: "location",
      availability: "available",
      displayName: session.worldEntry.location.name,
    });
  }
  const currentLocation = session.visibleState?.location;
  if (
    currentLocation?.source === "canonical" &&
    currentLocation.sourceRecordId
  ) {
    references.push({
      recordId: currentLocation.sourceRecordId,
      role: "anchor",
      recordType: "location",
      availability: "available",
      displayName: currentLocation.text,
    });
  }
  const here = session.places?.find(
    (place) => place.id === session.currentPlaceId,
  );
  if (here?.sourceRecordId) {
    references.push({
      recordId: here.sourceRecordId,
      role: "anchor",
      recordType: "location",
      availability: "available",
      displayName: here.name,
    });
  }
  const seen = new Set<string>();
  return references.filter(
    (reference) =>
      !seen.has(reference.recordId) && Boolean(seen.add(reference.recordId)),
  );
}
