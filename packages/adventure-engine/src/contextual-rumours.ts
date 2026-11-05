import type { AdventureSession, ScenarioItem } from "./types";

export const MAX_SCENARIO_COLLECTION_ITEMS = 8;

export interface LocationContext {
  name: string;
  recordId?: string;
}

/**
 * Extracts the current active location context from the adventure session.
 * Prefers visibleState.location (current location in play) over initial worldEntry.
 */
export function currentLocationContext(
  session: AdventureSession,
): LocationContext | null {
  const visible = session.visibleState?.location;
  if (visible && visible.text.trim()) {
    return {
      name: visible.text.trim(),
      ...(visible.sourceRecordId ? { recordId: visible.sourceRecordId } : {}),
    };
  }
  const entry = session.worldEntry?.location;
  if (entry && entry.name.trim()) {
    return {
      name: entry.name.trim(),
      ...(entry.kind === "canonical" ? { recordId: entry.recordId } : {}),
    };
  }
  return null;
}

/**
 * Checks if a scenario item is associated with a given location.
 */
export function matchesScenarioLocation(
  item: ScenarioItem,
  location: LocationContext,
): boolean {
  if (location.recordId) {
    if (item.anchorRefs.includes(location.recordId)) return true;
    if (item.origin.sourceRecordId === location.recordId) return true;
  }
  const locName = location.name.trim().toLowerCase();
  if (!locName) return false;
  if (item.origin.batchTitle?.toLowerCase().includes(locName)) return true;
  if (item.playerVisible.source?.toLowerCase().includes(locName)) return true;
  return false;
}

/**
 * Filters the scenario collection to return candidate opportunities relevant to the current location:
 * - All heard scenarios are always retained (for narrative continuity across visits).
 * - Unheard scenarios that are associated with the current location (or unanchored/general).
 */
export function candidateScenariosForLocation(
  session: AdventureSession,
  location?: LocationContext | null,
): ScenarioItem[] {
  const items = session.scenarioCollection?.items ?? [];
  const loc = location ?? currentLocationContext(session);
  if (!loc) {
    return items;
  }
  return items.filter((item) => {
    // Heard scenarios stay active and visible to the player regardless of current location
    if (item.knowledge === "heard") return true;
    // Unheard scenarios are candidates only if they match the current location or have no specific location tag
    return (
      matchesScenarioLocation(item, loc) ||
      (!item.origin.batchTitle?.startsWith("Rumours in ") &&
        !item.origin.sourceRecordId &&
        item.anchorRefs.length === 0)
    );
  });
}

/**
 * Determines whether the session needs candidate rumours prepared for the current location.
 */
export function needsContextualRumours(
  session: AdventureSession,
  location?: LocationContext | null,
): boolean {
  if (session.status && session.status !== "active") return false;
  if (session.pendingRoll) return false;
  const loc = location ?? currentLocationContext(session);
  if (!loc || !loc.name.trim()) return false;

  const items = session.scenarioCollection?.items ?? [];
  const heardCount = items.filter((item) => item.knowledge === "heard").length;
  if (heardCount >= MAX_SCENARIO_COLLECTION_ITEMS) return false;

  // If there are already unheard candidate rumours for this location, we don't need more
  const hasUnheardForLocation = items.some(
    (item) =>
      item.knowledge === "unheard" && matchesScenarioLocation(item, loc),
  );
  if (hasUnheardForLocation) return false;

  // If there are legacy gmThreads/secrets and no collection at all, check if legacy threads exist
  if (
    !session.scenarioCollection &&
    (session.hiddenState.secrets.length > 0 ||
      session.hiddenState.gmThreads.length > 0)
  ) {
    return false;
  }

  return true;
}

/**
 * Prunes older unheard scenarios from other locations if adding new scenarios would exceed MAX_SCENARIO_COLLECTION_ITEMS (8).
 * Never prunes heard scenarios.
 */
export function pruneUnheardScenariosForNewBatch(
  items: ScenarioItem[],
  newCount: number,
  currentLocation?: LocationContext | null,
): ScenarioItem[] {
  const total = items.length + newCount;
  if (total <= MAX_SCENARIO_COLLECTION_ITEMS) return items;

  const excess = total - MAX_SCENARIO_COLLECTION_ITEMS;
  const result = [...items];
  let removed = 0;

  // First pass: remove unheard items from OTHER locations
  for (let i = 0; i < result.length && removed < excess;) {
    const item = result[i]!;
    if (
      item.knowledge === "unheard" &&
      (!currentLocation || !matchesScenarioLocation(item, currentLocation))
    ) {
      result.splice(i, 1);
      removed += 1;
    } else {
      i += 1;
    }
  }

  // Second pass: if still excess, remove any unheard item
  for (let i = 0; i < result.length && removed < excess;) {
    const item = result[i]!;
    if (item.knowledge === "unheard") {
      result.splice(i, 1);
      removed += 1;
    } else {
      i += 1;
    }
  }

  return result;
}

/**
 * Validates that a scenario being revealed belongs to the session's current location,
 * if the scenario is bound to a specific location.
 * Returns an error string if mismatched, or null if valid.
 */
export function validateRevealedScenarioLocation(
  candidate: AdventureSession,
  scenario: ScenarioItem,
): string | null {
  const loc = currentLocationContext(candidate);
  const isBound =
    Boolean(scenario.origin.batchTitle?.startsWith("Rumours in ")) ||
    Boolean(scenario.origin.sourceRecordId) ||
    scenario.anchorRefs.length > 0;

  if (loc && isBound && !matchesScenarioLocation(scenario, loc)) {
    return `Scenario ${scenario.id} does not match active location ${loc.name}`;
  }
  return null;
}
