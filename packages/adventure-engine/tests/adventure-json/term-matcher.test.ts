import { describe, expect, it } from "vitest";
import { createBoundaryMatcher } from "../../src/adventure-json/term-matcher";

describe("createBoundaryMatcher", () => {
  it("matches overlapping suffix terms only at word boundaries", () => {
    const matcher = createBoundaryMatcher(["secret", "top-secret"]);

    expect(matcher("A top-secret note")).toBe(true);
    expect(matcher("A secret note")).toBe(true);
    expect(matcher("secretive")).toBe(false);
    expect(matcher("sub-top-secret-file")).toBe(false);
  });

  it("handles a 1 MiB term without building a million-node trie", () => {
    const hugeId = `id-${"a".repeat(1_000_000)}`;
    const matcher = createBoundaryMatcher([hugeId, "other-id"]);

    expect(matcher("short text")).toBe(false);
    expect(matcher("mentions other-id here")).toBe(true);
    expect(matcher(`mentions ${hugeId} here`)).toBe(true);
    expect(matcher(`mentions x${hugeId} here`)).toBe(false);
  });
});
