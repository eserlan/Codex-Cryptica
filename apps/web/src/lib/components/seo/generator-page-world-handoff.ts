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
  paramKeys: string[];
}

const DEVELOP_WORLD_PARAM_KEYS = [
  "developSystem",
  "developBody",
  "developBodyType",
  "developContext",
];

/**
 * Reads the query params a linked major body uses to hand off its name,
 * type, and system context to the World Generator draft. Returns null when
 * no handoff is present so callers can leave the draft untouched.
 */
export function parseDevelopWorldHandoff(
  searchParams: URLSearchParams,
): DevelopWorldHandoff | null {
  const systemTitle = searchParams.get("developSystem");
  const bodyName = searchParams.get("developBody");
  if (!systemTitle && !bodyName) return null;

  const bodyType = searchParams.get("developBodyType");
  const context = searchParams.get("developContext");
  const dominantFeature = bodyName
    ? `${bodyName}${bodyType ? ` (${bodyType})` : ""} — ${context || `part of the ${systemTitle} system.`}`
    : (context ?? "");

  return {
    dominantFeature,
    paramKeys: DEVELOP_WORLD_PARAM_KEYS,
  };
}
