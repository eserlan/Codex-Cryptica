export type AuthoredBeatStatus = "present" | "partial" | "absent";

/** One observable, player-facing beat defined by an evaluation fixture. */
export interface AuthoredBeat {
  id: string;
  label: string;
  /** Every phrase must appear for the beat to be fully present. */
  requiredEvidence: readonly string[];
  /** Any one of these phrases supports a partial result. */
  partialEvidence?: readonly string[];
}

export interface AuthoredBeatScore {
  id: string;
  label: string;
  status: AuthoredBeatStatus;
  matchedRequiredEvidence: string[];
  matchedPartialEvidence: string[];
}

function normalizeEvidence(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function validateBeats(beats: readonly AuthoredBeat[]): void {
  const ids = new Set<string>();
  for (const beat of beats) {
    if (!beat.id.trim() || ids.has(beat.id)) {
      throw new Error("Authored beats must have unique IDs.");
    }
    ids.add(beat.id);
    if (
      beat.requiredEvidence.length === 0 ||
      beat.requiredEvidence.some((phrase) => !normalizeEvidence(phrase))
    ) {
      throw new Error(
        `Authored beat ${beat.id} must include non-empty required evidence.`,
      );
    }
    if (beat.partialEvidence?.some((phrase) => !normalizeEvidence(phrase))) {
      throw new Error(`Authored beat ${beat.id} has empty partial evidence.`);
    }
  }
}

/**
 * Scores only fixture-authored evidence phrases. This is a transparent
 * coverage signal for human review, not a semantic judge or a safety gate.
 */
export function scoreAuthoredBeats(
  output: string | undefined,
  beats: readonly AuthoredBeat[],
): AuthoredBeatScore[] {
  validateBeats(beats);
  const normalizedOutput = ` ${normalizeEvidence(output ?? "")} `;
  return beats.map((beat) => {
    const matchedRequiredEvidence = beat.requiredEvidence.filter((phrase) =>
      normalizedOutput.includes(` ${normalizeEvidence(phrase)} `),
    );
    const matchedPartialEvidence = (beat.partialEvidence ?? []).filter(
      (phrase) => normalizedOutput.includes(` ${normalizeEvidence(phrase)} `),
    );
    const status: AuthoredBeatStatus =
      matchedRequiredEvidence.length === beat.requiredEvidence.length
        ? "present"
        : matchedRequiredEvidence.length > 0 ||
            matchedPartialEvidence.length > 0
          ? "partial"
          : "absent";
    return {
      id: beat.id,
      label: beat.label,
      status,
      matchedRequiredEvidence,
      matchedPartialEvidence,
    };
  });
}
