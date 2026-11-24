import type { DirectorCommitmentEntry } from "./gm-director-brief-contract";
import { clipText } from "./gm-director-brief-text";
import type { AdventureSession, CausalCommitment } from "./types";

const MAX_COMMITMENT_ENTRIES = 3;

function toCommitmentEntry(
  commitment: CausalCommitment,
): DirectorCommitmentEntry {
  return {
    id: clipText(commitment.id, 180),
    kind: commitment.kind,
    subject: clipText(commitment.subject, 180),
    summary: clipText(commitment.summary, 180),
  };
}

function collectCommitments(
  session: AdventureSession,
  scenarioId: string | undefined,
  classes: readonly CausalCommitment["commitmentClass"][],
): DirectorCommitmentEntry[] {
  return (session.causalCommitments ?? [])
    .filter(
      (commitment) =>
        commitment.status === "committed" &&
        classes.includes(commitment.commitmentClass) &&
        (scenarioId === undefined
          ? !commitment.scenarioId
          : commitment.scenarioId === scenarioId),
    )
    .slice(0, MAX_COMMITMENT_ENTRIES)
    .map(toCommitmentEntry);
}

export function collectCommittedExplanations(
  session: AdventureSession,
  scenarioId?: string,
): DirectorCommitmentEntry[] {
  return collectCommitments(session, scenarioId, ["supporting-explanation"]);
}

export function collectSpeculativeCommitments(
  session: AdventureSession,
  scenarioId: string,
): DirectorCommitmentEntry[] {
  return collectCommitments(session, scenarioId, [
    "belief-testimony",
    "speculative-plan",
  ]);
}
