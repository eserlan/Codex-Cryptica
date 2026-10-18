import type { SuggestedConnection } from "./campaign-generator-types";

/**
 * Shared model-response helper (#3184).
 *
 * Leaf module: `campaign-generator-service.ts` and
 * `campaign-council-vote-generation.ts` both need it, and importing it from
 * the service created a service ↔ generation cycle. Only this file's
 * type-only dependency on `campaign-generator-types` remains.
 */

/** Validate and normalise the model's "connections" array. */
export function parseConnections(
  value: unknown,
): SuggestedConnection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter(
      (c): c is SuggestedConnection =>
        !!c &&
        typeof c === "object" &&
        typeof (c as SuggestedConnection).targetTitle === "string" &&
        (c as SuggestedConnection).targetTitle.trim().length > 0,
    )
    .map((c) => ({
      targetTitle: c.targetTitle.trim(),
      relationship:
        typeof c.relationship === "string" && c.relationship.trim()
          ? c.relationship.trim()
          : "related",
    }));
  return out.length ? out : undefined;
}
