import { describe, expect, it } from "vitest";
import { makeStore } from "./biome-explorer.test-helpers";

describe("BiomeExplorerStore drafts", () => {
  it("starts a draft from a reference and keeps the reference link", () => {
    const { store } = makeStore();
    expect(store.draft).toBeNull();
    expect(store.startFromReference("tundra")).toBe(true);
    expect(store.draft?.profile.reference?.biomeId).toBe("tundra");
    expect(store.draft?.dirty).toBe(false);
    expect(store.view).toBe("editor");
  });

  it("refuses to start from an unknown reference", () => {
    const { store } = makeStore();
    expect(store.startFromReference("nowhere")).toBe(false);
    expect(store.draft).toBeNull();
  });

  it("starts a blank draft with no reference", () => {
    const { store } = makeStore();
    store.startBlank();
    expect(store.draft?.profile.reference).toBeNull();
    expect(store.draft?.title).toBe("");
  });

  it("marks the draft dirty when it is edited", () => {
    const { store } = makeStore();
    store.startFromReference("tundra");
    store.editOwn("vegetation", "Glowing moss");
    expect(store.draft?.profile.own.vegetation).toBe("Glowing moss");
    expect(store.draft?.dirty).toBe(true);
  });

  it("marks the draft dirty when the title or climate changes", () => {
    const { store } = makeStore();
    store.startBlank();
    store.setTitle("Ashen Taiga");
    expect(store.draft?.dirty).toBe(true);
    store.startBlank();
    store.editClimate({ seasonality: "Always autumn" });
    expect(store.draft?.dirty).toBe(true);
  });

  it("never changes the reference snapshot when editing", () => {
    const { store } = makeStore();
    store.startFromReference("tundra");
    const before = JSON.stringify(store.draft?.profile.reference);
    store.editOwn("terrain", "Black glass flats");
    expect(JSON.stringify(store.draft?.profile.reference)).toBe(before);
  });

  it("discards a clean draft at once", () => {
    const { store } = makeStore();
    store.startFromReference("tundra");
    expect(store.discardDraft()).toBe(true);
    expect(store.draft).toBeNull();
    expect(store.view).toBe("library");
  });

  it("asks for confirmation before discarding a dirty draft, and keeps it when declined", () => {
    const { store } = makeStore();
    store.startFromReference("tundra");
    store.editOwn("water", "Tidal pools");
    expect(store.discardDraft()).toBe(false);
    expect(store.discardPending).toBe(true);
    expect(store.draft).not.toBeNull();

    store.cancelDiscard();
    expect(store.discardPending).toBe(false);
    expect(store.draft?.profile.own.water).toBe("Tidal pools");

    expect(store.discardDraft(true)).toBe(true);
    expect(store.draft).toBeNull();
    expect(store.discardPending).toBe(false);
  });

  it("blocks saving without a name, shows the error and writes nothing", async () => {
    const { store, vault } = makeStore();
    store.startFromReference("tundra");
    store.editOwn("water", "Tidal pools");
    expect(await store.save()).toBe(false);
    expect(store.errors.some((e) => e.code === "title-required")).toBe(true);
    expect(vault.records.size).toBe(0);
    expect(store.draft).not.toBeNull();
  });

  it("clears the name error once a name is given", () => {
    const { store } = makeStore();
    store.startBlank();
    void store.save();
    store.setTitle("Ashen Taiga");
    expect(store.errors).toEqual([]);
  });
});

describe("BiomeExplorerStore library state", () => {
  it("remembers the last view on this device and tolerates broken storage", () => {
    const { store, storage } = makeStore();
    store.setView("compare");
    expect(storage.setItem).toHaveBeenCalledWith(
      "codex-biome-explorer-view",
      "compare",
    );
    const broken = makeStore({
      storage: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {
          throw new Error("blocked");
        },
        removeItem() {},
      },
    });
    expect(broken.store.view).toBe("library");
    expect(() => broken.store.setView("compare")).not.toThrow();
  });

  it("reads a remembered view back, and falls back to the library for an unknown one", () => {
    for (const view of ["library", "compare", "mine"] as const) {
      const { store } = makeStore({
        storage: {
          getItem: () => view,
          setItem() {},
          removeItem() {},
        },
      });
      expect(store.view).toBe(view);
    }
    for (const junk of ["editor", "nonsense", ""]) {
      const { store } = makeStore({
        storage: { getItem: () => junk, setItem() {}, removeItem() {} },
      });
      expect(store.view).toBe("library");
    }
  });
});

describe("BiomeExplorerStore comparison", () => {
  it("adds and removes biomes", () => {
    const { store } = makeStore();
    expect(store.toggleCompare("tundra")).toBe(true);
    expect(store.toggleCompare("hot-desert")).toBe(true);
    expect(store.compareIds).toEqual(["tundra", "hot-desert"]);
    expect(store.toggleCompare("tundra")).toBe(true);
    expect(store.compareIds).toEqual(["hot-desert"]);
  });

  it("allows at most three and says no to a fourth", () => {
    const { store } = makeStore();
    for (const id of ["tundra", "hot-desert", "savanna"])
      store.toggleCompare(id);
    expect(store.toggleCompare("wetland")).toBe(false);
    expect(store.compareIds).toEqual(["tundra", "hot-desert", "savanna"]);
    expect(store.compareFull).toBe(true);
  });

  it("ignores unknown biomes", () => {
    const { store } = makeStore();
    expect(store.toggleCompare("nowhere")).toBe(false);
    expect(store.compareIds).toEqual([]);
  });

  it("keeps the selection when the view changes, and can clear it", () => {
    const { store } = makeStore();
    store.toggleCompare("tundra");
    store.toggleCompare("savanna");
    store.setView("compare");
    store.setView("library");
    expect(store.compareIds).toHaveLength(2);
    store.clearCompare();
    expect(store.compareIds).toEqual([]);
  });

  it("builds a comparison once two biomes are chosen", () => {
    const { store } = makeStore();
    store.toggleCompare("tundra");
    expect(store.comparison.ok).toBe(false);
    store.toggleCompare("savanna");
    expect(store.comparison.ok).toBe(true);
  });
});
