import type { AdventureValidationError } from "./types";

export function error(code: AdventureValidationError["code"], message: string) {
  return { ok: false as const, errors: [{ code, message }] };
}

export function idAllocationError() {
  return error(
    "id-allocation-failed",
    "Could not allocate unique IDs for the generated state.",
  );
}
