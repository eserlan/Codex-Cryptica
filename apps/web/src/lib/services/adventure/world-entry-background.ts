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

  // Prefer the standard Vault-grounded generator. Retain its local fallback.
  const batch =
    generatedBatch ??
    generateRumourLocal(
      { locationContext: session.worldEntry!.location.name.slice(0, 80) },
      seededRandom(session.id),
    );
  const candidates = Array.from({ length: 6 }, (_, index) =>
    selectRumourForPlay(batch, index + 1),
  );
  // Preserve the generator's exact player/GM pairing and vary reliability.
  const chosen = [
    candidates.find((item) => item.gmOnly.reality === "essentially true"),
    candidates.find((item) => item.gmOnly.reality === "exaggeration"),
    candidates.find(
      (item) => item.gmOnly.reality === "dangerous misconception",
    ),
  ].filter((item): item is SelectedRumourForPlay => Boolean(item));

  return {
    ...session,
    hiddenState: {
      secrets: [
        ...session.hiddenState.secrets,
        ...chosen.map((item) => ({
          id: allocateId(),
          text: bounded(
            [
              `World-entry seed ${item.index} — original truth (${item.gmOnly.reality}):`,
              item.gmOnly.whatsActuallyHappening,
              `If investigated: ${item.gmOnly.ifInvestigated}`,
            ].join(" "),
          ),
          status: "hidden" as const,
          revealCondition:
            "Reveal only after justified discovery; never leak GM truth.",
        })),
      ],
      gmThreads: [
        ...session.hiddenState.gmThreads,
        ...chosen.map((item) => ({
          id: allocateId(),
          text: bounded(
            [
              `World-entry seed ${item.index} — DORMANT, NOT YET HEARD.`,
              `Possible hearsay: "${item.playerVisible.rumour}"`,
              `Lead: ${item.playerVisible.lead}.`,
              `Source: ${item.playerVisible.source}.`,
              "Progress: none. Introduce only when locally plausible.",
              "React to actions or explicit world time, not turn count.",
              "Treat as provisional until reconciled with Vault canon and date.",
            ].join(" "),
          ),
          status: "hidden" as const,
          revealCondition:
            "Player hears local gossip or discovers observable evidence.",
        })),
      ],
    },
  };
}

function bounded(value: string): string {
  return value.slice(0, 600);
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
