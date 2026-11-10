import type { AdventureSession, AdventureValidationError } from "./types";

export function error(code: AdventureValidationError["code"], message: string) {
  return { ok: false as const, errors: [{ code, message }] };
}

export function idAllocationError() {
  return error(
    "id-allocation-failed",
    "Could not allocate unique IDs for the generated state.",
  );
}

/** Stamp one successful reducer update; playing-time changes belong to completed turns. */
export function updatedSession(candidate: AdventureSession, now: string) {
  candidate.revision += 1;
  candidate.updatedAt = now;
  return { ok: true as const, value: candidate };
}
