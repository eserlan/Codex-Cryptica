import {
  generateRumourLocal,
  selectRumourForPlay,
  type RumourSelectionInput,
  type SelectedRumourForPlay,
} from "generator-engine";
import {
  currentLocationContext,
  needsContextualRumours,
  pruneUnheardScenariosForNewBatch,
  MAX_SCENARIO_COLLECTION_ITEMS,
  type AdventureSession,
  type LocationContext,
} from "@codex/adventure-engine";

/**
 * Prepare GM-only background situations from the existing Rumour Generator.
 * No rumour becomes player knowledge or Vault canon simply by being seeded.
 * The local-generator fallback invents provisional details; Oracle must
 * reconcile them against date-aware Vault sources before using them in play.
 */
export function needsWorldEntryBackground(
  session: AdventureSession,
  location?: LocationContext | null,
): boolean {
  return needsContextualRumours(session, location);
}

export function seedWorldEntryBackground(
  session: AdventureSession,
  allocateId: () => string,
  generatedBatch?: RumourSelectionInput,
  locationOverride?: LocationContext | null,
): AdventureSession {
  if (!needsWorldEntryBackground(session, locationOverride)) return session;

  const location = locationOverride ?? currentLocationContext(session);
  if (!location) return session;

  const locationContext = location.name.slice(0, 80);
  // Prefer the standard Vault-grounded generator. Incomplete categories or
  // text that cannot fit the persisted schema use the deterministic local set.
  const chosen =
    selectCompleteSet(generatedBatch) ??
    selectCompleteSet(
      generateRumourLocal(
        { locationContext },
        seededRandom(`${session.id}:${location.name}`),
      ),
    );
  if (!chosen) return session;

  const batchId = allocateId();
  const existingItems = session.scenarioCollection?.items ?? [];
  const existingLeads = new Set(
    existingItems.map((item) => item.playerVisible.lead.trim().toLowerCase()),
  );

  // Filter out any candidates that duplicate existing leads in the session
  const nonDuplicate = chosen.filter(
    (selected) =>
      !existingLeads.has(selected.playerVisible.lead.trim().toLowerCase()),
  );
  if (nonDuplicate.length === 0) return session;

  // Prune older unheard scenarios from other locations if adding these would exceed max 8
  const prunedExisting = pruneUnheardScenariosForNewBatch(
    existingItems,
    nonDuplicate.length,
    location,
  );

  const availableSlots = Math.max(
    0,
    MAX_SCENARIO_COLLECTION_ITEMS - prunedExisting.length,
  );
  if (availableSlots === 0) return session;

  const itemsToSeed = nonDuplicate.slice(0, availableSlots);

  const items = itemsToSeed.map((selected) => {
    const itemId = allocateId();
    return {
      version: 1 as const,
      id: itemId,
      origin: {
        ...selected.origin,
        batchId,
        batchTitle: `Rumours in ${location.name}`,
        ...(location.recordId ? { sourceRecordId: location.recordId } : {}),
      },
      playerVisible: {
        ...selected.playerVisible,
        source:
          selected.playerVisible.source || `Local talk in ${location.name}`,
      },
      gmOnly: {
        truth: `${selected.gmOnly.reality}: ${selected.gmOnly.whatsActuallyHappening}`,
        ifInvestigated: selected.gmOnly.ifInvestigated,
      },
      knowledge: "unheard" as const,
      status: "open" as const,
      events: [],
      anchorRefs: location.recordId ? [location.recordId] : [],
      revealedSecretIds: [],
      secretBindings: {
        truth: allocateId(),
        ifInvestigated: allocateId(),
        eventIds: {},
      },
    };
  });

  return {
    ...session,
    scenarioCollection: {
      version: 1,
      items: [...prunedExisting, ...items],
      focusedScenarioId: session.scenarioCollection?.focusedScenarioId ?? null,
    },
  };
}

const MAX_HIDDEN_TEXT_CHARS = 600;
const REALITIES = [
  "essentially true",
  "exaggeration",
  "dangerous misconception",
] as const;

function selectCompleteSet(
  batch: RumourSelectionInput | undefined,
): SelectedRumourForPlay[] | null {
  if (!batch) return null;
  try {
    const candidates = Array.from({ length: 6 }, (_, index) =>
      selectRumourForPlay(batch, index + 1),
    );
    const chosen = REALITIES.map((reality) =>
      candidates.find((item) => item.gmOnly.reality === reality),
    );
    if (chosen.some((item) => !item)) return null;
    const complete = chosen as SelectedRumourForPlay[];
    return complete.every(fitsPersistedFields) ? complete : null;
  } catch {
    return null;
  }
}

function fitsPersistedFields(item: SelectedRumourForPlay): boolean {
  return [
    item.gmOnly.whatsActuallyHappening,
    item.gmOnly.ifInvestigated,
    `${item.gmOnly.reality}: ${item.gmOnly.whatsActuallyHappening}`,
  ].every(
    (value) =>
      value.trim().length > 0 && value.trim().length <= MAX_HIDDEN_TEXT_CHARS,
  );
}

/** Stable within one session, including interrupted opening retries. */
function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
