import {
  createScenarioState,
  type ScenarioState,
} from "@codex/adventure-engine";
import type { SelectedRumourForPlay } from "generator-engine";

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

  prepare(
    vaultId: string,
    selected: SelectedRumourForPlay,
    scenario: ScenarioState,
  ): void {
    if (!vaultId.trim()) throw new Error("No active vault");
    this.pending = {
      vaultId,
      selected: structuredClone(selected),
      scenario: structuredClone(scenario),
    };
  }

  forVault(vaultId: string) {
    return this.pending?.vaultId === vaultId ? this.pending : null;
  }

  clear(): void {
    this.pending = null;
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
