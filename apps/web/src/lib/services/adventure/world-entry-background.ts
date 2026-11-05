import {
  generateRumourLocal,
  selectRumourForPlay,
  type RumourSelectionInput,
  type SelectedRumourForPlay,
} from "generator-engine";
import type { AdventureSession } from "@codex/adventure-engine";

/**
 * Prepare GM-only background situations from the existing Rumour Generator.
 * No rumour becomes player knowledge or Vault canon simply by being seeded.
 * The local-generator fallback invents provisional details; Oracle must
 * reconcile them against date-aware Vault sources before using them in play.
 */
export function needsWorldEntryBackground(session: AdventureSession): boolean {
  return Boolean(
    session.worldEntry &&
    !session.scenarioCollection?.items.length &&
    session.hiddenState.secrets.length === 0 &&
    session.hiddenState.gmThreads.length === 0,
  );
}

export function seedWorldEntryBackground(
  session: AdventureSession,
  allocateId: () => string,
  generatedBatch?: RumourSelectionInput,
): AdventureSession {
  if (!needsWorldEntryBackground(session)) return session;

  const locationContext = session.worldEntry!.location.name.slice(0, 80);
  // Prefer the standard Vault-grounded generator. Incomplete categories or
  // text that cannot fit the persisted schema use the deterministic local set.
  const chosen =
    selectCompleteSet(generatedBatch) ??
    selectCompleteSet(
      generateRumourLocal({ locationContext }, seededRandom(session.id)),
    );
  if (!chosen) return session;

  const batchId = allocateId();
  const items = chosen.map((selected) => {
    const itemId = allocateId();
    return {
      version: 1 as const,
      id: itemId,
      origin: { ...selected.origin, batchId },
      playerVisible: selected.playerVisible,
      gmOnly: {
        truth: `${selected.gmOnly.reality}: ${selected.gmOnly.whatsActuallyHappening}`,
        ifInvestigated: selected.gmOnly.ifInvestigated,
      },
      knowledge: "unheard" as const,
      status: "open" as const,
      events: [],
      anchorRefs: [],
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
      items: [...(session.scenarioCollection?.items ?? []), ...items],
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
