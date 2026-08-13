export function safeSnapshot<T>(obj: T): T {
  if (obj == null) return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }
}

export function getConsolidatedContext(
  entity: any,
  options?: {
    isGuest?: boolean;
    source?: string;
    instructions?: string;
    priority?: "instructions-first" | "incoming-first" | "preserve-existing";
  },
): string {
  const parts = [];
  if (!options?.isGuest && entity.lore?.trim()) parts.push(entity.lore.trim());
  if (entity.content?.trim()) parts.push(entity.content.trim());
  return parts.join("\n\n");
}

/**
 * Extracts and parses a JSON object embedded in a model response (which may
 * include leading/trailing prose around the JSON payload). Uses a greedy
 * match from the first `{` to the last `}`, so it assumes the response
 * contains at most one JSON object with no stray braces in the surrounding
 * prose. Returns undefined if no `{...}` span is found; throws if the
 * matched text isn't valid JSON.
 */
export function extractJsonFromModelResponse<T = any>(
  text: string,
): T | undefined {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return undefined;
  return JSON.parse(jsonMatch[0]) as T;
}
