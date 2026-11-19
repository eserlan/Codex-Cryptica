import { clonePreservingPrecision } from "./historical-anchor-chronology";
import {
  HISTORICAL_ANCHOR_TITLE_SECRET_ID,
  type GmHistoricalAnchorProjection,
  type PlayerHistoricalAnchorProjection,
} from "./historical-anchor-types";
import type { AdventureSession } from "./types";

/**
 * Player-safe projection of the session's historical anchor.
 * Never exposes unrevealed `documentedFacts`, unrevealed `title`,
 * `relevantEntityRefs`, or unrevealed future `eventInterval` details.
 */
export function projectPlayerHistoricalAnchor(
  session: AdventureSession,
): PlayerHistoricalAnchorProjection | undefined {
  const anchor = session.historicalAnchor;
  if (!anchor) return undefined;
  const revealedSet = new Set(anchor.revealedFactIds);
  return {
    version: anchor.version,
    policy: anchor.policy,
    startDate: clonePreservingPrecision(anchor.startDate),
    ...(revealedSet.has(HISTORICAL_ANCHOR_TITLE_SECRET_ID)
      ? { title: anchor.baseline.title }
      : {}),
    progress: {
      status: anchor.progress.status,
      updatedAtRevision: anchor.progress.updatedAtRevision,
      updatedAt: anchor.progress.updatedAt,
    },
    revealedFacts: anchor.baseline.documentedFacts.filter((fact) =>
      revealedSet.has(fact.id),
    ),
  };
}

/**
 * Full GM/Oracle projection of the session's historical anchor.
 */
export function projectGmHistoricalAnchor(
  session: AdventureSession,
): GmHistoricalAnchorProjection | undefined {
  const anchor = session.historicalAnchor;
  if (!anchor) return undefined;
  const revealedSet = new Set(anchor.revealedFactIds);
  return {
    version: anchor.version,
    policy: anchor.policy,
    eventRecordId: anchor.eventRecordId,
    title: anchor.baseline.title,
    titleRevealed: revealedSet.has(HISTORICAL_ANCHOR_TITLE_SECRET_ID),
    startDate: clonePreservingPrecision(anchor.startDate),
    eventInterval: anchor.eventInterval,
    documentedFacts: anchor.baseline.documentedFacts.map((fact) => ({
      ...fact,
      revealed: revealedSet.has(fact.id),
    })),
    openMechanisms: [...anchor.baseline.openMechanisms],
    relevantEntityRefs: [...anchor.baseline.relevantEntityRefs],
    progress: anchor.progress,
    drift: anchor.drift,
  };
}
