import { existingIds, type IdFactory } from "./reducer-ids";
import { error, idAllocationError } from "./reducer-result";
import { materializeProvisionalFacts } from "./provisional-facts";
import {
  applyHiddenPatch,
  applyVisiblePatch,
  materializeHiddenPatch,
  materializeVisiblePatch,
  sanitizeHiddenPatch,
  sanitizeVisiblePatch,
} from "./state-patches";
import type {
  AdventureSession,
  AdventureTurnProposal,
  ProvisionalFact,
  VisibleStatePatch,
  HiddenStatePatch,
} from "./types";

export type MaterializedTurnState = {
  visibleState: AdventureSession["visibleState"];
  hiddenState: AdventureSession["hiddenState"];
  provisionalFacts: ProvisionalFact[];
  updatedProvisionalFacts: ProvisionalFact[];
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
  /** Parts of the model's patches that could not apply and were left out. */
  dropped: string[];
};

export function materializeTurnState(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  turnId: string,
  createId: IdFactory,
): MaterializedTurnState | { error: ReturnType<typeof error> } {
  const ids = existingIds(session);
  const visiblePatch = materializeVisiblePatch(
    proposal.visiblePatch,
    ids,
    createId,
  );
  if (!visiblePatch.ok) {
    return {
      error: idAllocationError(),
    };
  }
  const hiddenPatch = materializeHiddenPatch(
    proposal.hiddenPatch,
    ids,
    createId,
  );
  if (!hiddenPatch.ok) {
    return {
      error: idAllocationError(),
    };
  }
  const materializedFacts = materializeProvisionalFacts(
    session,
    proposal.provisionalFacts,
    turnId,
    ids,
    createId,
  );
  if ("error" in materializedFacts) return materializedFacts;
  const dropped: string[] = [];
  const visibleApplied = sanitizeVisiblePatch(
    session.visibleState,
    visiblePatch.value,
    dropped,
  );
  const hiddenApplied = sanitizeHiddenPatch(
    session.hiddenState,
    hiddenPatch.value,
    dropped,
  );
  const visibleState = applyVisiblePatch(session.visibleState, visibleApplied);
  if (!visibleState.ok) {
    return { error: error("conflicting-patch", visibleState.errors) };
  }
  const hiddenState = applyHiddenPatch(session.hiddenState, hiddenApplied);
  if (!hiddenState.ok) {
    return { error: error("conflicting-patch", hiddenState.errors) };
  }
  return {
    visibleState: visibleState.value,
    hiddenState: hiddenState.value,
    provisionalFacts: materializedFacts.provisionalFacts,
    updatedProvisionalFacts: materializedFacts.updatedProvisionalFacts,
    visiblePatch: visibleApplied,
    hiddenPatch: hiddenApplied,
    dropped,
  };
}
