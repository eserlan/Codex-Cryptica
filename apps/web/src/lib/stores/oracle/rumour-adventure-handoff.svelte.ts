import {
  createScenarioState,
  type ScenarioState,
} from "@codex/adventure-engine";
import type {
  GeneratedDraft,
  SelectedRumourForPlay,
  SelectedAdventureForPlay,
} from "generator-engine";

export type PendingAdventureHandoff = {
  vaultId: string;
  selected: SelectedRumourForPlay | SelectedAdventureForPlay;
  scenario: ScenarioState;
  adventureTitle?: string;
  sourceGeneratorId?: "rumour" | "adventure";
};

/**
 * Transient, same-tab handoff. GM truth never enters query parameters, URLs,
 * storage, analytics or a player-facing projection. Clearing the handoff
 * leaves the source generator result unchanged.
 */
export class RumourAdventureHandoff {
  pending = $state.raw<PendingAdventureHandoff | null>(null);
  /**
   * The generator batch the rumour or adventure came from, held in memory only (never
   * persisted) so cancelling can return to the unchanged draft.
   */
  private source: { vaultId: string; draft: GeneratedDraft } | null = null;

  prepare(
    vaultId: string,
    selected: SelectedRumourForPlay,
    scenario: ScenarioState,
    sourceDraft?: GeneratedDraft,
  ): void {
    if (!vaultId.trim()) throw new Error("No active vault");
    this.pending = {
      vaultId,
      selected: structuredClone(selected),
      scenario: structuredClone(scenario),
      sourceGeneratorId: "rumour",
    };
    this.source = sourceDraft
      ? { vaultId, draft: structuredClone(sourceDraft) }
      : null;
  }

  prepareAdventure(
    vaultId: string,
    selected: SelectedAdventureForPlay,
    scenario: ScenarioState,
    sourceDraft?: GeneratedDraft,
  ): void {
    if (!vaultId.trim()) throw new Error("No active vault");
    this.pending = {
      vaultId,
      selected: structuredClone(selected),
      scenario: structuredClone(scenario),
      adventureTitle:
        selected?.playerVisible?.title ?? sourceDraft?.title ?? undefined,
      sourceGeneratorId: "adventure",
    };
    this.source = sourceDraft
      ? { vaultId, draft: structuredClone(sourceDraft) }
      : null;
  }

  forVault(vaultId: string) {
    return this.pending?.vaultId === vaultId ? this.pending : null;
  }

  /** The rumour/adventure was played or abandoned: drop it and its source batch. */
  clear(): void {
    this.pending = null;
    this.source = null;
  }

  /**
   * Cancel the selected rumour or adventure but keep its source draft for this Vault, so
   * the generator can reopen on it. Returns whether a draft is available.
   */
  cancel(vaultId: string): boolean {
    this.pending = null;
    if (this.source && this.source.vaultId !== vaultId) this.source = null;
    return this.source !== null;
  }

  /** Hand the kept draft back once; only within the same Vault. */
  takeSourceDraft(vaultId: string): GeneratedDraft | null {
    const source = this.source;
    if (!source || source.vaultId !== vaultId) return null;
    this.source = null;
    return source.draft;
  }
}

export const rumourAdventureHandoff = new RumourAdventureHandoff();

/** Safe, canonical conversion shared by UI and tests. */
export function buildRumourScenario(
  selected: SelectedRumourForPlay,
  id: string,
): ScenarioState {
  return createScenarioState({
    id,
    origin: selected.origin,
    playerVisible: {
      rumour: selected.playerVisible.rumour,
      lead: selected.playerVisible.lead,
      source: selected.playerVisible.source,
    },
    gmOnly: {
      truth: selected.gmOnly.whatsActuallyHappening,
      ifInvestigated: [
        "Original reality: " + selected.gmOnly.reality,
        selected.gmOnly.ifInvestigated,
      ].join(" "),
    },
  });
}

function clampString(value: string, maxLength = 600): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1).trimEnd() + "…";
}

/** Safe, canonical conversion for ready-made generated adventures. */
export function buildReadyAdventureScenario(
  selected: SelectedAdventureForPlay,
  id: string,
): ScenarioState {
  const rumour = clampString(selected.playerVisible.openingSituation);
  const lead = clampString(selected.playerVisible.primaryObjective);
  const truth = clampString(selected.gmOnly.truth);
  const ifInvestigated = clampString(selected.gmOnly.ifInvestigated);

  const actor = clampString(
    selected.gmOnly.npcsAndFactions[0] || "Primary Antagonist",
  );
  const goal = lead;
  const currentStance = "Active / Escalating";
  const trigger = "Player inaction or world time advancement";
  const progression = "The threat advances its agenda across key locations";
  const expectedConsequence = truth;

  return createScenarioState({
    id,
    origin: {
      kind: "manual",
      manualId: selected.origin.manualId || id,
      ...(selected.origin.sourceRecordId
        ? { sourceRecordId: selected.origin.sourceRecordId }
        : {}),
    },
    playerVisible: {
      rumour,
      lead,
      source: selected.playerVisible.title,
    },
    gmOnly: {
      truth,
      ifInvestigated,
    },
    pressure: {
      actor,
      goal,
      currentStance,
      trigger,
      progression,
      expectedConsequence,
    },
  });
}
