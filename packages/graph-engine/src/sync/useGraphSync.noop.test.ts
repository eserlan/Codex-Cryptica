import { describe, expect, it } from "vitest";
import cytoscape from "cytoscape";
import { syncGraphElements, type SyncOptions } from "./useGraphSync";

/**
 * Real headless Cytoscape, so the test observes the `data` events a sync
 * actually emits. Each one dirties an element's style and wakes every data
 * listener (the minimap rebuilt itself per event), so an unchanged graph must
 * re-sync without emitting any.
 */
const elements = (title = "Hero") =>
  [
    // The transform's weight counts every connection; the rendered weight
    // (recomputed by the sync) counts only visible edges.
    { group: "nodes", data: { id: "a", label: title, weight: 5, type: "npc" } },
    { group: "nodes", data: { id: "b", label: "B", weight: 5, type: "npc" } },
    { group: "edges", data: { id: "a-b", source: "a", target: "b" } },
  ] as SyncOptions["elements"];

const sync = (cy: cytoscape.Core, els: SyncOptions["elements"]) =>
  syncGraphElements(cy, {
    elements: els,
    vaultStatus: "idle",
    initialLoaded: true,
    isTemporalMetadataEqual: (a, b) => a === b,
  });

function syncedGraph() {
  const cy = cytoscape({ headless: true });
  sync(cy, elements());
  // What ImageManager writes after resolving a silhouette token.
  cy.$id("a").data({
    resolvedImage: "blob:token",
    isSilhouette: true,
    appliedSilhouetteKey: "npc:0",
  });
  let dataEvents = 0;
  cy.on("data", () => dataEvents++);
  return { cy, events: () => dataEvents };
}

describe("syncGraphElements with an unchanged graph", () => {
  it("emits no data events and keeps rendered weights", () => {
    const { cy, events } = syncedGraph();
    expect(cy.$id("a").data("weight")).toBe(1);

    sync(cy, elements());

    expect(events()).toBe(0);
    expect(cy.$id("a").data("weight")).toBe(1);
  });

  it("keeps the keys ImageManager owns", () => {
    const { cy } = syncedGraph();

    sync(cy, elements());

    expect(cy.$id("a").data()).toMatchObject({
      resolvedImage: "blob:token",
      isSilhouette: true,
      appliedSilhouetteKey: "npc:0",
    });
  });

  it("still applies a real data change", () => {
    const { cy, events } = syncedGraph();

    sync(cy, elements("Renamed"));

    expect(cy.$id("a").data("label")).toBe("Renamed");
    expect(events()).toBe(1);
  });
});
