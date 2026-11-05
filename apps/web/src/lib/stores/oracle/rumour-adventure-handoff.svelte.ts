import {
  createScenarioState,
  type ScenarioState,
} from "@codex/adventure-engine";
import type { GeneratedDraft, SelectedRumourForPlay } from "generator-engine";

/**
 * Transient, same-tab handoff. GM truth never enters query parameters, URLs,
 * storage, analytics or a player-facing projection. Clearing the handoff
 * leaves the source generator result unchanged.
 */
export class RumourAdventureHandoff {
  pending = $state.raw<{
    vaultId: string;
    selected: SelectedRumourForPlay;
    scenario: ScenarioState;
  } | null>(null);
  /**
   * The generator batch the rumour came from, held in memory only (never
   * persisted) so cancelling can return to the unchanged six rumours.
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
    };
    this.source = sourceDraft
      ? { vaultId, draft: structuredClone(sourceDraft) }
      : null;
  }

  forVault(vaultId: string) {
    return this.pending?.vaultId === vaultId ? this.pending : null;
  }

  /** The rumour was played or abandoned: drop it and its source batch. */
  clear(): void {
    this.pending = null;
    this.source = null;
  }

  /**
   * Cancel the selected rumour but keep its source batch for this Vault, so
   * the generator can reopen on it. Returns whether a batch is available.
   */
  cancel(vaultId: string): boolean {
    this.pending = null;
    if (this.source && this.source.vaultId !== vaultId) this.source = null;
    return this.source !== null;
  }

  /** Hand the kept batch back once; only within the same Vault. */
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
