import {
  generateRumourLocal,
  selectRumourForPlay,
  type RumourSelectionInput,
  type SelectedRumourForPlay,
} from "generator-engine";
import type { AdventureSession } from "@codex/adventure-engine";

/**
 * Prepare GM-only background situations from the existing Rumour Generator.
 * Each seed is a situation already unfolding; the rumour is one of several
 * ways it may surface. No seed becomes player knowledge or Vault canon simply
 * by being seeded.
 * The local-generator fallback invents provisional details; Oracle must
 * reconcile them against date-aware Vault sources before using them in play.
 */
export function needsWorldEntryBackground(session: AdventureSession): boolean {
  return Boolean(
    session.worldEntry &&
    !session.scenarioState &&
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

  return {
    ...session,
    hiddenState: {
      secrets: [
        ...session.hiddenState.secrets,
        ...chosen.flatMap((item) => [
          {
            id: allocateId(),
            text: item.gmOnly.whatsActuallyHappening,
            status: "hidden" as const,
            revealCondition:
              "Reveal only after justified discovery; never leak GM truth.",
          },
          {
            id: allocateId(),
            text: item.gmOnly.ifInvestigated,
            status: "hidden" as const,
            revealCondition:
              "Reveal only after justified discovery; never leak GM truth.",
          },
        ]),
      ],
      gmThreads: [
        ...session.hiddenState.gmThreads,
        ...chosen.map((item) => ({
          id: allocateId(),
          text: seedThreadText(item),
          status: "hidden" as const,
          revealCondition:
            "Player notices a sign, overhears talk or discovers evidence.",
        })),
      ],
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

/**
 * A seed is a situation already unfolding in the world. The rumour is only
 * one way it can surface; the GM tracks how visible it is via `Stage`.
 */
function seedThreadText(item: SelectedRumourForPlay): string {
  return [
    `World-entry seed ${item.index} — ${item.gmOnly.reality}; UNFOLDING, UNNOTICED.`,
    "Already happening; its paired secrets hold the truth.",
    `Possible hearsay: "${item.playerVisible.rumour}"`,
    `Lead: ${item.playerVisible.lead}.`,
    `Source: ${item.playerVisible.source}.`,
    "Stage: unnoticed.",
    "May surface as traces, changed behaviour, notices, consequences or talk.",
    "Treat as provisional until reconciled with Vault canon and date.",
  ].join(" ");
}

function fitsPersistedFields(item: SelectedRumourForPlay): boolean {
  return [
    item.gmOnly.whatsActuallyHappening,
    item.gmOnly.ifInvestigated,
    seedThreadText(item),
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
