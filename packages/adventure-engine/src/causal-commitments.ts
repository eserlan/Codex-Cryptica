import { allocateId, type IdFactory } from "./reducer-ids";
import { error, idAllocationError } from "./reducer-result";
import type {
  AdventureSession,
  CausalCommitment,
  NewCausalCommitment,
} from "./types";

export type MaterializedCausalCommitments = {
  causalCommitments: CausalCommitment[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable structured identity, independent of turn/input IDs (retry-safe). */
export function causalCommitmentKey(
  entry: Pick<CausalCommitment, "kind" | "subject" | "scenarioId" | "actorRef">,
): string {
  return [
    entry.kind,
    normalize(entry.subject),
    entry.scenarioId ?? "",
    entry.actorRef
      ? `${entry.actorRef.tier}:${normalize(entry.actorRef.value)}`
      : "",
  ].join("|");
}

type Allocation =
  { entry: CausalCommitment } | { error: ReturnType<typeof error> };

function allocateCommitment(
  session: AdventureSession,
  rest: Omit<NewCausalCommitment, "contested">,
  status: CausalCommitment["status"],
  turnId: string,
  ids: Set<string>,
  createId: IdFactory,
): Allocation {
  const id = allocateId(ids, createId);
  if (!id) return { error: idAllocationError() };
  return {
    entry: {
      ...rest,
      id,
      status,
      sourceTurnId: turnId,
      sourceRevision: session.revision,
    },
  };
}

export function materializeCausalCommitments(
  session: AdventureSession,
  proposed: NewCausalCommitment[],
  turnId: string,
  ids: Set<string>,
  createId: IdFactory,
): MaterializedCausalCommitments | { error: ReturnType<typeof error> } {
  const known = new Map<string, CausalCommitment>();
  const seenSummaries = new Set<string>();
  for (const entry of session.causalCommitments ?? []) {
    const key = causalCommitmentKey(entry);
    if (!known.has(key)) known.set(key, entry);
    seenSummaries.add(`${key}\n${normalize(entry.summary)}`);
  }
  const added: CausalCommitment[] = [];

  for (const proposal of proposed) {
    const { contested, ...rest } = proposal;
    const key = causalCommitmentKey(rest);
    const prior = known.get(key);
    if (seenSummaries.has(`${key}\n${normalize(rest.summary)}`)) {
      continue; // Already recorded in some status: retry adds nothing.
    }
    // Reaching here with a prior means a different summary for the same
    // key: the original stands and this claim is contested. An explicit
    // flag is contested from the start; a plain first proposal commits.
    const status: CausalCommitment["status"] =
      prior || contested ? "contested" : "committed";
    const result = allocateCommitment(
      session,
      rest,
      status,
      turnId,
      ids,
      createId,
    );
    if ("error" in result) return result;
    added.push(result.entry);
    seenSummaries.add(`${key}\n${normalize(rest.summary)}`);
    if (!prior) known.set(key, result.entry);
  }
  return { causalCommitments: added };
}

export function mergeCausalCommitments(
  current: CausalCommitment[] | undefined,
  materialized: MaterializedCausalCommitments,
): CausalCommitment[] {
  return [...(current ?? []), ...materialized.causalCommitments];
}
