import { describe, it, expect } from "vitest";
import { restoreMissingMetadata } from "./entity-content-loader.svelte";

describe("restoreMissingMetadata", () => {
  it("does not overwrite a field that already exists in memory (stale-disk guard)", () => {
    // The user just applied a label in memory; the file on disk is stale.
    const entity = { labels: ["party"], tags: ["hero"] };
    const disk = { labels: [], tags: ["hero"] };
    expect(restoreMissingMetadata(entity, disk)).toEqual({});
  });

  it("restores a metadata key that is missing from memory", () => {
    const entity = { labels: ["party"] };
    const disk = { labels: [], parent: "the-keep" };
    expect(restoreMissingMetadata(entity, disk)).toEqual({
      parent: "the-keep",
    });
  });

  it("restores a key that is present but undefined in memory", () => {
    const entity: Record<string, unknown> = { parent: undefined };
    const disk = { parent: "the-keep" };
    expect(restoreMissingMetadata(entity, disk)).toEqual({
      parent: "the-keep",
    });
  });

  it("ignores undefined values on disk", () => {
    const entity = {};
    const disk = { parent: undefined, labels: ["x"] };
    expect(restoreMissingMetadata(entity, disk)).toEqual({ labels: ["x"] });
  });

  it("returns an empty patch when disk has nothing new", () => {
    const entity = { labels: ["a"], tags: ["b"] };
    const disk = { labels: ["a"], tags: ["b"] };
    expect(restoreMissingMetadata(entity, disk)).toEqual({});
  });
});
