import { existingIds, type IdFactory } from "./reducer-ids";
import { error, idAllocationError } from "./reducer-result";
import { materializeProvisionalFacts } from "./provisional-facts";
import {
  applyHiddenPatch,
  applyVisiblePatch,
  materializeHiddenPatch,
  materializeVisiblePatch,
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
  const visibleState = applyVisiblePatch(
    session.visibleState,
    visiblePatch.value,
  );
  if (!visibleState.ok) {
    return { error: error("conflicting-patch", visibleState.errors) };
  }
  const hiddenState = applyHiddenPatch(session.hiddenState, hiddenPatch.value);
  if (!hiddenState.ok) {
    return { error: error("conflicting-patch", hiddenState.errors) };
  }
  return {
    visibleState: visibleState.value,
    hiddenState: hiddenState.value,
    provisionalFacts: materializedFacts.provisionalFacts,
    updatedProvisionalFacts: materializedFacts.updatedProvisionalFacts,
    visiblePatch: visiblePatch.value,
    hiddenPatch: hiddenPatch.value,
  };
}
