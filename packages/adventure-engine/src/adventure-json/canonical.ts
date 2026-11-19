import type { AdventureJsonV1 } from "./schema";

export function sortKeysRecursively(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const inner = record[key];
    if (inner !== undefined) {
      sorted[key] = sortKeysRecursively(inner);
    }
  }
  return sorted;
}

/**
 * Deterministic canonical JSON serialization with recursively sorted object keys
 * (mirroring `canonicalJson` in `@codex/schema`).
 */
export function canonicalizeAdventureJson(pkg: AdventureJsonV1): string {
  return JSON.stringify(pkg, (_key, inner) => {
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
      return inner;
    }
    return sortKeysRecursively(inner);
  });
}

/**
 * Computes the 64-character lowercase SHA-256 hex digest of an Adventure JSON v1
 * package or canonical JSON string using Web Crypto.
 */
export async function computeAdventureJsonHash(
  pkg: AdventureJsonV1 | string,
): Promise<string> {
  const canonical =
    typeof pkg === "string"
      ? canonicalizeAdventureJson(JSON.parse(pkg) as AdventureJsonV1)
      : canonicalizeAdventureJson(pkg);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
