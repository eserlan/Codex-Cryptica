import {
  STAT_BLOCK_SOURCE_LIMIT,
  StatBlockSourceEmptyError,
  StatBlockSourceTooLongError,
} from "./errors";

/** Keys Foundry adds to every actor export that carry no stat block content. */
const NOISE_KEYS = new Set(["_stats", "ownership", "prototypeToken", "img"]);

/**
 * Trims Foundry export noise from JSON input so real exports fit the limit
 * (research R5). Plain text is returned unchanged.
 */
export function prepareStatBlockSource(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return raw;
  }
  return JSON.stringify(stripNoise(parsed, undefined));
}

function stripNoise(value: unknown, parentKey: string | undefined): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripNoise(item, parentKey));
  }
  if (value === null || typeof value !== "object") return value;

  const inEffects = parentKey === "effects";
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (NOISE_KEYS.has(key)) continue;
    if (inEffects && key === "icon") continue;
    out[key] = stripNoise(child, key);
  }
  return out;
}

/** Throws before any AI call when the source is empty or over the limit. */
export function assertSourceLength(source: string): void {
  if (source.trim() === "") throw new StatBlockSourceEmptyError();
  if (source.length > STAT_BLOCK_SOURCE_LIMIT) {
    throw new StatBlockSourceTooLongError(
      source.length,
      STAT_BLOCK_SOURCE_LIMIT,
    );
  }
}
