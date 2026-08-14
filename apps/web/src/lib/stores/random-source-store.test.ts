import { describe, it, expect, beforeEach } from "vitest";
import {
  RandomSourceStore,
  pathOf,
  slugify,
  type RandomSourceFiles,
} from "./random-source-store.svelte";
import { VaultDeckStateStore } from "./deck-state-store";
import type { RandomSource } from "random-source-engine";

/** In-memory stand-in for the vault's file surface. */
class MemoryFiles implements RandomSourceFiles {
  data = new Map<string, string>();

  async list(dir: string) {
    return [...this.data.keys()].filter((p) => p.startsWith(`${dir}/`));
  }
  async read(path: string) {
    return this.data.get(path);
  }
  async write(path: string, contents: string) {
    this.data.set(path, contents);
  }
  async remove(path: string) {
    this.data.delete(path);
  }
}

let files: MemoryFiles;
let store: RandomSourceStore;
let counter: number;

beforeEach(() => {
  files = new MemoryFiles();
  counter = 0;
  store = new RandomSourceStore(files, { uuid: () => `id-${++counter}` });
});

describe("create and save", () => {
  it("creates a weighted table by default", () => {
    const table = store.create("table", "Forest");
    expect(table.selection).toEqual({ mode: "weighted" });
    expect(table.entries).toEqual([]);
  });

  it("creates a deck that draws without replacement by default", () => {
    const deck = store.create("deck", "Complications");
    expect(deck.deckOptions?.drawMode).toBe("without-replacement");
  });

  it("writes the source to the vault", async () => {
    await store.save(store.create("table", "Forest"));
    expect(files.data.has("_tables/forest.md")).toBe(true);
  });

  it("puts decks in their own directory", async () => {
    await store.save(store.create("deck", "Complications"));
    expect(files.data.has("_decks/complications.md")).toBe(true);
  });

  it("adds the source to the in-memory list", async () => {
    await store.save(store.create("table", "Forest"));
    expect(store.tables).toHaveLength(1);
  });
});

describe("name uniqueness (FR-003a)", () => {
  it("refuses to save a colliding name", async () => {
    await store.save(store.create("table", "Forest"));
    const diagnostics = await store.save(store.create("table", "Forest"));
    expect(diagnostics.some((d) => d.code === "duplicate-name")).toBe(true);
    expect(store.tables).toHaveLength(1);
  });

  it("treats a differently-cased name as a collision", async () => {
    await store.save(store.create("table", "Forest"));
    const diagnostics = await store.save(store.create("table", "FOREST"));
    expect(diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("collides across kinds, since references cannot tell them apart", async () => {
    await store.save(store.create("table", "Shared"));
    const diagnostics = await store.save(store.create("deck", "Shared"));
    expect(diagnostics.some((d) => d.code === "duplicate-name")).toBe(true);
  });

  it("allows re-saving the same source under its own name", async () => {
    const table = store.create("table", "Forest");
    await store.save(table);
    const diagnostics = await store.save({ ...table, labels: ["woods"] });
    expect(diagnostics.some((d) => d.severity === "error")).toBe(false);
  });

  it("does not block a save for warnings alone", async () => {
    // An empty table warns but must still save — a half-finished table is a
    // normal thing to keep mid-edit.
    const diagnostics = await store.save(store.create("table", "Empty"));
    expect(diagnostics.some((d) => d.code === "empty-source")).toBe(true);
    expect(store.tables).toHaveLength(1);
  });
});

describe("rename, duplicate, delete", () => {
  it("moves the file when renaming", async () => {
    const table = store.create("table", "Forest");
    await store.save(table);
    await store.rename(table, "Woods");
    expect(files.data.has("_tables/forest.md")).toBe(false);
    expect(files.data.has("_tables/woods.md")).toBe(true);
  });

  it("refuses a rename onto an existing name", async () => {
    const a = store.create("table", "Forest");
    await store.save(a);
    await store.save(store.create("table", "Woods"));
    const diagnostics = await store.rename(a, "Woods");
    expect(diagnostics.some((d) => d.code === "duplicate-name")).toBe(true);
  });

  it("gives a duplicate a distinct name and id", async () => {
    const table = store.create("table", "Forest");
    await store.save(table);
    const copy = await store.duplicate(table);
    expect(copy.id).not.toBe(table.id);
    expect(copy.name).toBe("Forest copy");
  });

  it("keeps duplicating without colliding", async () => {
    const table = store.create("table", "Forest");
    await store.save(table);
    await store.duplicate(table);
    const second = await store.duplicate(table);
    expect(second.name).toBe("Forest copy 2");
  });

  it("removes the file and the list entry on delete", async () => {
    const table = store.create("table", "Forest");
    await store.save(table);
    await store.remove(table);
    expect(files.data.size).toBe(0);
    expect(store.tables).toHaveLength(0);
  });
});

describe("load", () => {
  it("round-trips saved sources", async () => {
    const table: RandomSource = {
      ...store.create("table", "Forest"),
      entries: [{ id: "e1", text: "A {creature}", weight: 2 }],
    };
    await store.save(table);

    const reloaded = new RandomSourceStore(files);
    await reloaded.load();
    expect(reloaded.tables[0].entries?.[0].text).toBe("A {creature}");
  });

  it("skips an unparseable file rather than failing the whole load", async () => {
    await store.save(store.create("table", "Good"));
    await files.write("_tables/broken.md", "not a source file");

    const reloaded = new RandomSourceStore(files);
    await reloaded.load();
    expect(reloaded.tables).toHaveLength(1);
  });
});

describe("references", () => {
  it("finds sources that reference a name (FR-042)", async () => {
    await store.save({
      ...store.create("table", "Parent"),
      entries: [{ id: "e1", text: "A {creature} appears" }],
    });
    expect(store.referencesTo("creature").map((s) => s.name)).toEqual([
      "Parent",
    ]);
  });

  it("matches a reference case-insensitively", async () => {
    await store.save({
      ...store.create("table", "Parent"),
      entries: [{ id: "e1", text: "A {Creature} appears" }],
    });
    expect(store.referencesTo("creature")).toHaveLength(1);
  });

  it("finds references inside card text too", async () => {
    await store.save({
      ...store.create("deck", "Deck"),
      cards: [{ id: "c1", title: "T", body: "A {creature}" }],
    });
    expect(store.referencesTo("creature")).toHaveLength(1);
  });

  it("resolves references when rolling", async () => {
    await store.save({
      ...store.create("table", "creature"),
      entries: [{ id: "e1", text: "troll" }],
    });
    const parent = {
      ...store.create("table", "Parent"),
      entries: [{ id: "e1", text: "A {creature}" }],
    };
    await store.save(parent);
    expect(store.roll(parent).finalText).toBe("A troll");
  });
});

describe("rename and delete impact (FR-042)", () => {
  it("names the sources that would break", async () => {
    const creature = {
      ...store.create("table", "creature"),
      entries: [{ id: "e1", text: "troll" }],
    };
    await store.save(creature);
    await store.save({
      ...store.create("table", "Encounter"),
      entries: [{ id: "e1", text: "A {creature} appears" }],
    });

    const impact = store.impactOf(creature);
    expect(impact.safe).toBe(false);
    expect(impact.referencedBy.map((s) => s.name)).toEqual(["Encounter"]);
  });

  it("reports a source nothing points at as safe", async () => {
    const lonely = {
      ...store.create("table", "Lonely"),
      entries: [{ id: "e1", text: "nothing" }],
    };
    await store.save(lonely);
    expect(store.impactOf(lonely)).toEqual({ referencedBy: [], safe: true });
  });

  it("ignores a source that only references itself", async () => {
    const recursive = {
      ...store.create("table", "Loop"),
      entries: [{ id: "e1", text: "and then {Loop}" }],
    };
    await store.save(recursive);
    expect(store.impactOf(recursive).safe).toBe(true);
  });
});

describe("name suggestions (FR-040)", () => {
  beforeEach(async () => {
    await store.save(store.create("table", "Forest Encounters"));
    await store.save(store.create("table", "Forest Loot"));
    await store.save(store.create("deck", "Complications"));
  });

  it("suggests close matches for a near miss", () => {
    expect(store.suggestNames("Forest Encounter")).toContain(
      "Forest Encounters",
    );
  });

  it("returns nothing for input with no resemblance", () => {
    expect(store.suggestNames("zzzzzz")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(store.suggestNames("")).toEqual([]);
  });
});

describe("paths", () => {
  it("slugifies a name", () => {
    expect(slugify("Forest Encounters!")).toBe("forest-encounters");
  });

  it("falls back for a name with no usable characters", () => {
    expect(slugify("!!!")).toBe("untitled");
  });

  it("routes tables and decks to different directories", () => {
    expect(pathOf({ kind: "table", name: "A" } as RandomSource)).toBe(
      "_tables/a.md",
    );
    expect(pathOf({ kind: "deck", name: "A" } as RandomSource)).toBe(
      "_decks/a.md",
    );
  });
});

describe("VaultDeckStateStore", () => {
  it("reports an untouched deck when no state file exists", async () => {
    const deckStore = new VaultDeckStateStore(files);
    expect(await deckStore.read("d1")).toBeUndefined();
  });

  it("round-trips deck state", async () => {
    const deckStore = new VaultDeckStateStore(files);
    await deckStore.write({ deckId: "d1", drawn: ["c1"], updatedAt: 5 });
    expect((await deckStore.read("d1"))?.drawn).toEqual(["c1"]);
  });

  it("stores state beside the deck so it travels with the vault", async () => {
    const deckStore = new VaultDeckStateStore(files);
    await deckStore.write({ deckId: "d1", drawn: [], updatedAt: 0 });
    expect([...files.data.keys()][0].startsWith("_decks/")).toBe(true);
  });

  it("treats a corrupt state file as an untouched deck", async () => {
    await files.write("_decks/state/d1.json", "{ not json");
    const deckStore = new VaultDeckStateStore(files);
    expect(await deckStore.read("d1")).toBeUndefined();
  });

  it("treats a structurally wrong state file as untouched", async () => {
    await files.write("_decks/state/d1.json", '{"drawn":"nope"}');
    const deckStore = new VaultDeckStateStore(files);
    expect(await deckStore.read("d1")).toBeUndefined();
  });
});
