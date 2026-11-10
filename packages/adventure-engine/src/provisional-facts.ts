import { allocateId, type IdFactory } from "./reducer-ids";
import { error, idAllocationError } from "./reducer-result";
import type {
  AdventureSession,
  AdventureTurnProposal,
  NewProvisionalFact,
  ProvisionalFact,
} from "./types";

type MaterializedProvisionalFacts = {
  provisionalFacts: ProvisionalFact[];
  updatedProvisionalFacts: ProvisionalFact[];
};

function findMatchingProvisionalFact(
  facts: ProvisionalFact[],
  kind: ProvisionalFact["kind"],
  normalizedName: string,
): ProvisionalFact | undefined {
  return facts.find(
    (fact) =>
      fact.kind === kind && fact.name.trim().toLowerCase() === normalizedName,
  );
}

function updateMaterializedProvisionalFact(
  existing: ProvisionalFact,
  proposal:
    typeof existing | Omit<ProvisionalFact, "id" | "introducedOnTurnId">,
  updates: ProvisionalFact[],
): void {
  const updated = mergeProvisionalFact(existing, proposal);
  const index = updates.findIndex((fact) => fact.id === updated.id);
  if (index === -1) {
    updates.push(updated);
  } else {
    updates[index] = updated;
  }
}

function updateDuplicateProposal(
  facts: ProvisionalFact[],
  proposal:
    (typeof facts)[number] | Omit<ProvisionalFact, "id" | "introducedOnTurnId">,
  normalizedName: string,
): boolean {
  const existing = findMatchingProvisionalFact(
    facts,
    proposal.kind,
    normalizedName,
  );
  if (!existing) return false;

  Object.assign(existing, mergeProvisionalFact(existing, proposal));
  return true;
}

export function materializeProvisionalFacts(
  session: AdventureSession,
  proposedFacts: Extract<
    AdventureTurnProposal,
    { kind: "complete" }
  >["provisionalFacts"],
  turnId: string,
  ids: Set<string>,
  createId: IdFactory,
): MaterializedProvisionalFacts | { error: ReturnType<typeof error> } {
  const provisionalFacts: ProvisionalFact[] = [];
  const updatedProvisionalFacts: ProvisionalFact[] = [];
  const canonicalNames = new Set(
    session.sourceRecords.map((record) =>
      record.displayName.trim().toLowerCase(),
    ),
  );

  for (const fact of proposedFacts) {
    const normName = fact.name.trim().toLowerCase();
    if (canonicalNames.has(normName)) continue;

    const existing = findMatchingProvisionalFact(
      session.provisionalFacts,
      fact.kind,
      normName,
    );
    if (existing) {
      updateMaterializedProvisionalFact(
        existing,
        fact,
        updatedProvisionalFacts,
      );
      continue;
    }

    if (updateDuplicateProposal(provisionalFacts, fact, normName)) continue;

    const id = allocateId(ids, createId);
    if (!id) {
      return {
        error: idAllocationError(),
      };
    }
    provisionalFacts.push({ ...fact, id, introducedOnTurnId: turnId });
  }

  return { provisionalFacts, updatedProvisionalFacts };
}

function mergeProvisionalFact(
  existing: ProvisionalFact,
  proposal: NewProvisionalFact,
): ProvisionalFact {
  return {
    ...existing,
    summary: proposal.summary,
    ...(proposal.visibility === "gm-only" ? { visibility: "gm-only" } : {}),
    ...(proposal.scenarioId ? { scenarioId: proposal.scenarioId } : {}),
  };
}
