/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
  }),
}));

import { GraphStore } from "./graph.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

/**
 * Minimal reactive vault mirroring the real EntityStore split: `entities` is
 * the full record (replaced on every content load), while `graphEntities` and
 * `graphStructureVersion` only change for graph-relevant edits.
 */
class ReactiveVault {
  entities = $state<Record<string, any>>({});
  graphEntities = $state<any[]>([]);
  graphStructureVersion = $state(0);
  inboundConnections = $state<Record<string, any[]>>({});
  selectedEntityId = $state<string | null>(null);
  activeVaultId = "vault-1";
  defaultVisibility = "visible";

  get allEntities() {
    return this.graphEntities;
  }
}

// Above the large-graph node threshold so the focus view culls.
const ENTITY_COUNT = 701;

function createLargeVault() {
  const vault = new ReactiveVault();
  const entities = Array.from({ length: ENTITY_COUNT }, (_, index) => ({
    id: `node-${index}`,
    type: "npc",
    title: `Node ${index}`,
    content: "preview",
    lore: "",
    tags: [],
    labels: [],
    connections:
      index === 0
        ? [
            { target: "node-1", type: "ally" },
            { target: "node-2", type: "ally" },
          ]
        : [],
  }));
  vault.entities = Object.fromEntries(entities.map((e) => [e.id, e]));
  vault.graphEntities = entities;
  vault.selectedEntityId = "node-0";
  return vault;
}

function trackElements(store: GraphStore) {
  let runs = 0;
  const cleanup = $effect.root(() => {
    $effect(() => {
      void store.elements;
      runs++;
    });
  });
  flushSync();
  return {
    get runs() {
      return runs;
    },
    cleanup,
  };
}

describe("GraphStore focus view reactivity", () => {
  it("does not rebuild elements when a rendered entity's content loads", () => {
    sessionModeStore.sharedMode = false;
    const vault = createLargeVault();
    const store = new GraphStore(vault as any);
    const tracker = trackElements(store);

    expect(store.focusViewActive).toBe(true);
    const before = store.elements;
    expect(before.some((el: any) => el.data?.id === "node-1")).toBe(true);
    const runsBefore = tracker.runs;

    // What EntityContentLoader does: replace the record with full content.
    vault.entities["node-1"] = {
      ...vault.entities["node-1"],
      content: "full markdown body",
      lore: "full lore",
    };
    vault.entities["node-0"] = {
      ...vault.entities["node-0"],
      content: "another body",
    };
    flushSync();

    expect(tracker.runs).toBe(runsBefore);
    expect(store.elements).toBe(before);
    tracker.cleanup();
  });

  it("still rebuilds elements for a graph-relevant change", () => {
    sessionModeStore.sharedMode = false;
    const vault = createLargeVault();
    const store = new GraphStore(vault as any);
    const tracker = trackElements(store);
    const before = store.elements;
    const runsBefore = tracker.runs;

    const renamed = { ...vault.entities["node-1"], title: "Renamed" };
    vault.entities["node-1"] = renamed;
    vault.graphEntities = vault.graphEntities.map((e) =>
      e.id === "node-1" ? renamed : e,
    );
    vault.graphStructureVersion++;
    flushSync();

    expect(tracker.runs).toBeGreaterThan(runsBefore);
    expect(store.elements).not.toBe(before);
    const node = store.elements.find((el: any) => el.data?.id === "node-1");
    expect(node?.data?.label).toBe("Renamed");
    tracker.cleanup();
  });
});
