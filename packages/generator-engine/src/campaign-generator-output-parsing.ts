import { parseConnections } from "./campaign-connections";
import { normalizeHolidayGenericOutput } from "./public-holiday";
import type { StarSystemBody } from "./public-star-system";
import type { GeneratorOutput } from "./campaign-generator-types";
import { parseTovMechanics } from "./tov-mechanics-parser";

/** Required fields for a generic AI response; see per-generator exceptions. */
function hasValidGenericShape(
  parsed: Record<string, unknown>,
  generatorId: string,
): boolean {
  // The rumour prompt's schema historically had no `summary`; a model that
  // follows it faithfully must not be discarded for the offline template.
  const summaryOk =
    typeof parsed.summary === "string" ||
    (generatorId === "rumour" && parsed.summary === undefined);
  if (typeof parsed.title !== "string" || !summaryOk) return false;
  if (typeof parsed.lore !== "string") return false;
  if (generatorId !== "secret-society") return true;
  return (
    parsed.lore.trim().length > 0 &&
    typeof parsed.content === "string" &&
    parsed.content.trim().length > 0
  );
}

/**
 * Parses and validates a generic (non-dungeon/language/council-vote)
 * generator's raw AI response into a `GeneratorOutput`, shared by
 * `generateDraft`'s buffered generic branch and `generateDraftStream`'s
 * streaming counterpart so the two never silently diverge on what counts as
 * a valid response. Returns `null` for invalid JSON or a response missing
 * required fields — the caller decides what "invalid" means next (retry,
 * fall through to local generation, etc.), this function only classifies.
 */
export function parseGenericGeneratorOutput(
  raw: string,
  generatorId: string,
): GeneratorOutput | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (generatorId === "holiday") normalizeHolidayGenericOutput(parsed);

  if (!hasValidGenericShape(parsed, generatorId)) return null;

  const observanceFields = [
    "name",
    "type",
    "when",
    "observers",
    "traditions",
    "tension",
  ] as const;
  const observances = Array.isArray(parsed.observances)
    ? parsed.observances.every(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          observanceFields.every((field) => {
            const value = (entry as Record<string, unknown>)[field];
            return typeof value === "string" && value.trim().length > 0;
          }),
      )
      ? parsed.observances
      : undefined
    : undefined;

  return {
    title: parsed.title as string,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    lore: parsed.lore as string,
    content: typeof parsed.content === "string" ? parsed.content : undefined,
    labels: Array.isArray(parsed.labels) ? parsed.labels : [],
    connections: parseConnections(parsed.connections),
    // Only the star-system generator's schema asks for these; every other
    // generator's response simply won't include them.
    bodies: Array.isArray(parsed.bodies)
      ? parsed.bodies.filter(
          (b): b is StarSystemBody =>
            typeof (b as { name?: unknown })?.name === "string" &&
            typeof (b as { type?: unknown })?.type === "string",
        )
      : undefined,
    starType: typeof parsed.starType === "string" ? parsed.starType : undefined,
    observances,
    mechanics: parseTovMechanics(parsed),
    systemId:
      typeof parsed.systemId === "string"
        ? parsed.systemId
        : parseTovMechanics(parsed)?.systemId,
  };
}
