import { describe, expect, it } from "vitest";
import { isGraphRelevantEntityChange } from "./entity-equality";
import type { LocalEntity } from "./types";

/**
 * This predicate is the gate on whether an edit reaches the graph at all: a
 * change it calls irrelevant never patches `graphEntities`, so the derived
 * elements keep the old entity and the node goes on painting whatever it
 * painted before. Anything the graph renders therefore has to be listed here.
 */
const base = {
  id: "eldrin",
  title: "Eldrin the Wise",
  type: "character",
  labels: [],
  aliases: [],
  connections: [],
  content: "",
  status: "active",
} as unknown as LocalEntity;

const changed = (patch: Partial<LocalEntity>) =>
  isGraphRelevantEntityChange(base, { ...base, ...patch } as LocalEntity);

describe("isGraphRelevantEntityChange", () => {
  it("ignores an edit the graph does not render", () => {
    expect(changed({ content: "A wizard of some renown." })).toBe(false);
    expect(isGraphRelevantEntityChange(base, { ...base })).toBe(false);
  });

  it("catches a silhouette change, which is what a node paints without a portrait", () => {
    expect(changed({ silhouette: "gothic-vampire-female" })).toBe(true);
  });

  it("catches an image focus change, which reframes the portrait in the node", () => {
    expect(changed({ imageFocus: "top" })).toBe(true);
  });

  it.each([
    ["title", { title: "Eldrin the Grey" }],
    ["type", { type: "creature" }],
    ["image", { image: "images/eldrin.png" }],
    ["thumbnail", { thumbnail: "images/eldrin-thumb.png" }],
    ["status", { status: "draft" as const }],
    ["labels", { labels: ["important"] }],
  ])("catches a %s change", (_field, patch) => {
    expect(changed(patch as Partial<LocalEntity>)).toBe(true);
  });

  describe("connections", () => {
    const link = { target: "keep", type: "owns", strength: 1 };
    const withLinks = (connections: unknown[]) =>
      isGraphRelevantEntityChange(
        { ...base, connections: [link] } as unknown as LocalEntity,
        { ...base, connections } as unknown as LocalEntity,
      );

    it("catches hiding a connection, so the edge leaves the graph", () => {
      expect(withLinks([{ ...link, hidden: true }])).toBe(true);
    });

    it("catches showing a hidden connection again", () => {
      expect(
        isGraphRelevantEntityChange(
          {
            ...base,
            connections: [{ ...link, hidden: true }],
          } as unknown as LocalEntity,
          { ...base, connections: [link] } as unknown as LocalEntity,
        ),
      ).toBe(true);
    });

    it("treats hidden: false and no flag as the same connection (negative)", () => {
      expect(withLinks([{ ...link, hidden: false }])).toBe(false);
      expect(withLinks([{ ...link }])).toBe(false);
    });

    it("catches a changed or extra connection", () => {
      expect(withLinks([{ ...link, type: "rival" }])).toBe(true);
      expect(withLinks([link, { ...link, target: "tower" }])).toBe(true);
    });
  });
});
