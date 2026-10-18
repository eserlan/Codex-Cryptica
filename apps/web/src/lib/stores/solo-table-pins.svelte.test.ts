import { describe, it, expect, vi } from "vitest";
import { SoloTablePinsStore, pinsKey } from "./solo-table-pins.svelte";

function memory(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

function make(
  opts: {
    vault?: string | null;
    tables?: string[];
    storage?: ReturnType<typeof memory>;
  } = {},
) {
  let vault: string | null = opts.vault === undefined ? "v1" : opts.vault;
  let tables = opts.tables ?? ["t1", "t2", "t3", "t4"];
  const storage = opts.storage ?? memory();
  const store = new SoloTablePinsStore({
    storage,
    vaultId: () => vault,
    tableIds: () => tables,
  });
  return {
    store,
    storage,
    setVault: (v: string | null) => (vault = v),
    setTables: (t: string[]) => (tables = t),
  };
}

describe("SoloTablePinsStore", () => {
  it("stores pins per vault under the vault's key", () => {
    const { store, storage } = make();
    expect(store.pin("t1")).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      pinsKey("v1"),
      JSON.stringify(["t1"]),
    );
    expect(store.pins).toEqual(["t1"]);
  });

  it("allows at most 3 pins", () => {
    const { store } = make();
    expect(store.pin("t1")).toBe(true);
    expect(store.pin("t2")).toBe(true);
    expect(store.pin("t3")).toBe(true);
    expect(store.pin("t4")).toBe(false);
    expect(store.pins).toHaveLength(3);
  });

  it("refuses a table that is not in the vault", () => {
    const { store } = make({ tables: ["t1"] });
    expect(store.pin("ghost")).toBe(false);
    expect(store.pins).toEqual([]);
  });

  it("ignores duplicates and unpins", () => {
    const { store } = make();
    store.pin("t1");
    expect(store.pin("t1")).toBe(false);
    expect(store.pins).toEqual(["t1"]);
    store.unpin("t1");
    expect(store.pins).toEqual([]);
  });

  it("hides and prunes pins for tables that no longer exist", () => {
    const { store, setTables, storage } = make();
    store.pin("t1");
    store.pin("t2");
    setTables(["t2"]);
    expect(store.pins).toEqual(["t2"]);
    setTables(["t2", "t3"]);
    store.pin("t3");
    expect(storage.setItem).toHaveBeenLastCalledWith(
      pinsKey("v1"),
      JSON.stringify(["t2", "t3"]),
    );
  });

  it("reads an unreadable value as no pins", () => {
    const storage = memory({ [pinsKey("v1")]: "{nope" });
    const { store } = make({ storage });
    expect(store.pins).toEqual([]);
  });

  it("shows each vault's own pins after a vault switch", () => {
    const storage = memory({ [pinsKey("v2")]: JSON.stringify(["t3"]) });
    const { store, setVault } = make({ storage });
    store.pin("t1");
    setVault("v2");
    expect(store.pins).toEqual(["t3"]);
  });
});
