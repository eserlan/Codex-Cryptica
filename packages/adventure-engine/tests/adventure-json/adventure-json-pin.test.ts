import { describe, expect, it } from "vitest";
import {
  checkAdventurePackagePin,
  type AdventureSourcePackageRef,
  type StoredAdventurePackage,
} from "../../src";

const ref: AdventureSourcePackageRef = {
  packageId: "the-last-grind",
  version: "1.0.0",
  formatVersion: "adventure-json/v1",
  hash: "a".repeat(64),
};

function stored(overrides: {
  hash?: string;
  id?: string;
  version?: string;
  format?: string;
}): StoredAdventurePackage {
  return {
    hash: overrides.hash ?? ref.hash,
    path: "",
    originFormat: "adventure-json/v1",
    package: {
      id: overrides.id ?? ref.packageId,
      version: overrides.version ?? ref.version,
      formatVersion: overrides.format ?? ref.formatVersion,
    },
  } as unknown as StoredAdventurePackage;
}

describe("checkAdventurePackagePin", () => {
  it("accepts a package that matches hash, id, version and format version", () => {
    expect(checkAdventurePackagePin(ref, stored({}))).toEqual({ ok: true });
  });

  it("reports a missing package", () => {
    expect(checkAdventurePackagePin(ref, null)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it.each([
    ["hash", { hash: "b".repeat(64) }],
    ["id", { id: "other" }],
    ["version", { version: "2.0.0" }],
    ["format version", { format: "adventure-json/v2" }],
  ])("reports a %s mismatch", (_name, overrides) => {
    expect(checkAdventurePackagePin(ref, stored(overrides))).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });
});
