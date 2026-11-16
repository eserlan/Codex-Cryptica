import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeAdventureJson,
  computeAdventureJsonHash,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE_FIXTURE_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
);

function reverseKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseKeysDeep);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const reversed: Record<string, unknown> = {};
  for (const key of Object.keys(record).reverse()) {
    reversed[key] = reverseKeysDeep(record[key]);
  }
  return reversed;
}

describe("Adventure JSON v1 canonical serialization & hashing", () => {
  it("produces identical canonical strings regardless of object key ordering", () => {
    const original = JSON.parse(
      readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
    ) as AdventureJsonV1;
    const reordered = reverseKeysDeep(original) as AdventureJsonV1;

    expect(JSON.stringify(original)).not.toBe(JSON.stringify(reordered));
    expect(canonicalizeAdventureJson(original)).toBe(
      canonicalizeAdventureJson(reordered),
    );
  });

  it("produces identical 64-char lowercase SHA-256 hex hashes regardless of key ordering", async () => {
    const original = JSON.parse(
      readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
    ) as AdventureJsonV1;
    const reordered = reverseKeysDeep(original) as AdventureJsonV1;

    const hashA = await computeAdventureJsonHash(original);
    const hashB = await computeAdventureJsonHash(reordered);
    const hashFromString = await computeAdventureJsonHash(
      JSON.stringify(reordered),
    );

    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    expect(hashA).toBe(hashB);
    expect(hashA).toBe(hashFromString);
  });

  it("changes the hash when adventure content changes", async () => {
    const original = JSON.parse(
      readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
    ) as AdventureJsonV1;
    const modified: AdventureJsonV1 = {
      ...original,
      version: "1.0.1",
    };

    const hashA = await computeAdventureJsonHash(original);
    const hashB = await computeAdventureJsonHash(modified);
    expect(hashA).not.toBe(hashB);
  });
});
