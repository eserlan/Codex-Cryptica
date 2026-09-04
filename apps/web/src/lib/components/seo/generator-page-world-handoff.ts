/**
 * Pure helpers for the World Generator's setup from a hub theme and from the
 * "Develop this world" handoff coming from a generated star system (#1935).
 */

export function worldGenreForHub(hubGenre: string | null): string {
  if (hubGenre === "Cyberpunk") return "Cyberpunk";
  if (hubGenre === "Optimistic Exploration Sci-Fi") return "Hopeful Sci-Fi";
  if (hubGenre === "Space Opera Resistance") return "Space Opera";
  if (hubGenre === "Lancer") return "Lancer";
  return "Hard Sci-Fi";
}

export interface DevelopWorldHandoff {
  dominantFeature: string;
  paramKeys: readonly string[];
}

const DEVELOP_WORLD_PARAM_KEYS = [
  "developSystem",
  "developBody",
  "developBodyType",
  "developContext",
] as const;

function normalize(value: string | null): string {
  return value?.trim() ?? "";
}

/**
 * Reads the query params a linked major body uses to hand off its name,
 * type, and system context to the World Generator draft. Returns null when
 * no meaningful handoff data is present so callers can leave the draft
 * untouched. `developSystem` alone (with no body) never yields a handoff,
 * since it has nothing to contribute to `dominantFeature`.
 */
export function parseDevelopWorldHandoff(
  searchParams: URLSearchParams,
): DevelopWorldHandoff | null {
  const systemTitle = normalize(searchParams.get("developSystem"));
  const bodyName = normalize(searchParams.get("developBody"));
  if (!bodyName) return null;

  const bodyType = normalize(searchParams.get("developBodyType"));
  const context = normalize(searchParams.get("developContext"));
  const detail = context || (systemTitle ? `part of the ${systemTitle} system.` : "");
  const dominantFeature = `${bodyName}${bodyType ? ` (${bodyType})` : ""}${detail ? ` — ${detail}` : ""}`;

  return {
    dominantFeature,
    paramKeys: DEVELOP_WORLD_PARAM_KEYS,
  };
}
