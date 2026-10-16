import {
  GeneratorMechanicsBundleSchema,
  type GeneratorMechanicsBundle,
} from "./tov-mechanics-schema";

/**
 * Safely parses and validates a Tales of the Valiant mechanics bundle from
 * an unknown raw value (object, nested `{ mechanics: ... }`, or JSON string).
 * Returns `undefined` if validation fails or input is missing.
 */
export function parseTovMechanics(
  raw: unknown,
): GeneratorMechanicsBundle | undefined {
  if (!raw) return undefined;

  let candidate = raw;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }

  if (typeof candidate !== "object" || candidate === null) {
    return undefined;
  }

  // If wrapped under a `mechanics` key
  if ("mechanics" in candidate && candidate.mechanics) {
    const wrappedResult = GeneratorMechanicsBundleSchema.safeParse(
      candidate.mechanics,
    );
    if (wrappedResult.success) {
      return wrappedResult.data;
    }
  }

  // Direct parse
  const directResult = GeneratorMechanicsBundleSchema.safeParse(candidate);
  if (directResult.success) {
    return directResult.data;
  }

  return undefined;
}
