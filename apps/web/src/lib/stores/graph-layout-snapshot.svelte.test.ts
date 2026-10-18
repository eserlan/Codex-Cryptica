/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
  }),
}));

import { flushSync } from "svelte";
import { GraphStore } from "./graph.svelte";
import { GraphLayoutPresets } from "$lib/components/graph/graph-layout-presets.svelte";
import { ViewPresetsStore } from "./view-presets.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

class FakeVault {
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

const entity = (
  id: string,
  x?: number,
  y?: number,
  connections: any[] = [],
) => ({
  id,
  type: "npc",
  title: id,
  content: "",
  lore: "",
  tags: [],
  labels: [],
  connections,
  ...(x === undefined ? {} : { metadata: { coordinates: { x, y } } }),
});

function setup() {
  sessionModeStore.sharedMode = false;
  const vault = new FakeVault();
  const list = [
    entity("a", 10, 10, [{ target: "b", type: "ally" }]),
    entity("b", 20, 20),
    entity("c", 30, 30),
  ];
  vault.entities = Object.fromEntries(list.map((e) => [e.id, e]));
  vault.graphEntities = list;
  let n = 0;
  const put = vi.fn().mockResolvedValue(undefined);
  const presets = new ViewPresetsStore({
    clock: { now: () => 1000 },
    idGenerator: { uuid: () => `p${++n}` },
    getDb: vi.fn().mockResolvedValue({ get: vi.fn(), put }) as any,
  });
  const store = new GraphStore(
    vault as any,
    undefined,
    undefined,
    undefined,
    undefined,
    presets,
  );
  return { vault, store, presets, put };
}

const positionOf = (store: GraphStore, id: string) =>
  (store.elements.find((el: any) => el.data?.id === id) as any)?.position;
const camera = { pan: { x: 4, y: 5 }, zoom: 1.5 };
const layout = {
  positions: { a: { x: 100, y: 100 }, b: { x: 200, y: 200 } },
};

describe("GraphStore view layouts (#3456)", () => {
  it("saves a view with its layout and camera when asked", async () => {
    const { store, presets } = setup();

    const saved = await store.saveViewPreset("With layout", camera, layout);

    expect(saved?.state.layout).toEqual(layout);
    expect(saved?.state.viewport).toEqual(camera);
    expect(presets.presets).toHaveLength(1);
  });

  it("saves a filter-only view with no layout by default", async () => {
    const { store } = setup();

    const saved = await store.saveViewPreset("Filters only", camera);

    expect("layout" in saved!.state).toBe(false);
    expect(saved?.state.viewport).toEqual(camera);
  });

  it("puts saved positions on the graph when a view with a layout is applied", async () => {
    const { store } = setup();
    const saved = await store.saveViewPreset("V", camera, layout);

    const result = store.applyViewPreset(saved!.id);

    expect(result?.layoutApplied).toBe(true);
    expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });
    expect(positionOf(store, "b")).toEqual({ x: 200, y: 200 });
    // Not in the layout: keeps its everyday position.
    expect(positionOf(store, "c")).toEqual({ x: 30, y: 30 });
  });

  it("never changes the everyday arrangement (SC-005)", async () => {
    const { store, vault } = setup();
    const before = JSON.stringify(
      Object.values(vault.entities).map((e: any) => e.metadata?.coordinates),
    );
    const saved = await store.saveViewPreset("V", camera, layout);

    store.applyViewPreset(saved!.id);
    void store.elements;
    store.resetView();

    expect(
      JSON.stringify(
        Object.values(vault.entities).map((e: any) => e.metadata?.coordinates),
      ),
    ).toBe(before);
  });

  it("returns to the everyday arrangement when a view with no layout is applied", async () => {
    const { store } = setup();
    const withLayout = await store.saveViewPreset("A", camera, layout);
    const plain = await store.saveViewPreset("B", camera);

    store.applyViewPreset(withLayout!.id);
    expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });

    const result = store.applyViewPreset(plain!.id);

    expect(result?.layoutApplied).toBe(false);
    expect(store.layoutOverride).toBeNull();
    expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
  });

  it("returns to the everyday arrangement on reset to default", async () => {
    const { store } = setup();
    const saved = await store.saveViewPreset("V", camera, layout);
    store.applyViewPreset(saved!.id);

    store.resetView();

    expect(store.layoutOverride).toBeNull();
    expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
  });

  it("does not apply a saved layout to a view that uses timeline or orbit mode (negative)", async () => {
    const { store } = setup();
    store.timelineMode = true;
    const timeline = await store.saveViewPreset("T", camera, layout);
    store.timelineMode = false;

    const result = store.applyViewPreset(timeline!.id);

    expect(result?.layoutApplied).toBe(false);
    expect(store.layoutOverride).toBeNull();
    expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
  });

  it("ignores saved entities that no longer exist and places the rest (negative)", async () => {
    const { store } = setup();
    const saved = await store.saveViewPreset("V", camera, {
      positions: { ...layout.positions, deleted: { x: 1, y: 1 } },
    });

    expect(() => store.applyViewPreset(saved!.id)).not.toThrow();

    expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });
    expect(positionOf(store, "deleted")).toBeUndefined();
  });

  it("leaves an entity added since the layout was saved to be placed by the graph, not moved onto a saved one", async () => {
    const { store, vault } = setup();
    const saved = await store.saveViewPreset("V", camera, layout);
    const added = entity("new", undefined, undefined, [
      { target: "a", type: "ally" },
    ]);
    vault.graphEntities = [...vault.graphEntities, added];
    vault.entities = { ...vault.entities, new: added };

    store.applyViewPreset(saved!.id);

    const node = store.elements.find((el: any) => el.data?.id === "new") as any;
    expect(node.data.isPendingLayout).toBe(true);
    expect(node.position).not.toEqual({ x: 100, y: 100 });
    expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });
  });

  describe("updating and removing a layout", () => {
    it("updates the layout of a view that is open, so it is what is on screen", async () => {
      const { store } = setup();
      const saved = await store.saveViewPreset("V", camera, layout);
      store.applyViewPreset(saved!.id);
      const newer = { positions: { a: { x: 7, y: 7 }, c: { x: 8, y: 8 } } };

      const updated = await store.updateViewPresetLayout(
        saved!.id,
        camera,
        newer,
      );

      expect(updated?.state.layout).toEqual(newer);
      expect(positionOf(store, "a")).toEqual({ x: 7, y: 7 });
      expect(positionOf(store, "c")).toEqual({ x: 8, y: 8 });
    });

    it("updates a view that is not open without changing what is on screen", async () => {
      const { store } = setup();
      const open = await store.saveViewPreset("Open", camera, layout);
      const other = await store.saveViewPreset("Other", camera);
      store.applyViewPreset(open!.id);

      await store.updateViewPresetLayout(other!.id, camera, {
        positions: { a: { x: 1, y: 1 } },
      });

      expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });
    });

    it("removes a layout, returning an open view to the everyday arrangement", async () => {
      const { store } = setup();
      const saved = await store.saveViewPreset("V", camera, layout);
      store.applyViewPreset(saved!.id);

      const updated = await store.updateViewPresetLayout(
        saved!.id,
        camera,
        null,
      );

      expect("layout" in updated!.state).toBe(false);
      expect(updated?.name).toBe("V");
      expect(store.layoutOverride).toBeNull();
      expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
    });

    it("leaves things as they were when the change cannot be stored (negative)", async () => {
      const { store, put } = setup();
      const saved = await store.saveViewPreset("V", camera, layout);
      store.applyViewPreset(saved!.id);
      put.mockRejectedValueOnce(new Error("quota"));

      const updated = await store.updateViewPresetLayout(
        saved!.id,
        camera,
        null,
      );

      expect(updated).toBeNull();
      expect(positionOf(store, "a")).toEqual({ x: 100, y: 100 });
    });
  });

  it("drops the layout when the open view is deleted, and keeps it when another is (negative)", async () => {
    const { store } = setup();
    const open = await store.saveViewPreset("Open", camera, layout);
    const other = await store.saveViewPreset("Other", camera);
    store.applyViewPreset(open!.id);

    await store.deleteViewPreset(other!.id);
    expect(store.layoutOverride).not.toBeNull();

    await store.deleteViewPreset(open!.id);
    expect(store.layoutOverride).toBeNull();
    expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
  });

  it("keeps the layout through a rename", async () => {
    const { store } = setup();
    const saved = await store.saveViewPreset("V", camera, layout);
    store.applyViewPreset(saved!.id);

    await store.renameViewPreset(saved!.id, "Renamed");

    expect(store.layoutOverride).not.toBeNull();
    expect(store.viewPresets[0].state.layout).toEqual(layout);
  });

  it("never applies another vault's layout after switching vaults (negative)", async () => {
    const { store, vault } = setup();
    const saved = await store.saveViewPreset("V", camera, layout);
    store.applyViewPreset(saved!.id);

    vault.activeVaultId = "vault-2";
    await store.loadViewPresets();

    expect(store.layoutOverride).toBeNull();
    expect(positionOf(store, "a")).toEqual({ x: 10, y: 10 });
  });
});

describe("GraphLayoutPresets follows the open view (#3456)", () => {
  it("updates which view counts as open while the panel stays open", async () => {
    const { store } = setup();
    const first = await store.saveViewPreset("First", camera, layout);
    const second = await store.saveViewPreset("Second", camera, layout);
    const layouts = new GraphLayoutPresets(store, () => undefined);
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(layouts.isOpen(first!.id));
      });
    });
    flushSync();
    expect(seen.at(-1)).toBe(false);

    store.applyViewPreset(first!.id);
    flushSync();
    expect(seen.at(-1)).toBe(true);

    store.applyViewPreset(second!.id);
    flushSync();
    expect(seen.at(-1)).toBe(false);
    stop();
  });
});
