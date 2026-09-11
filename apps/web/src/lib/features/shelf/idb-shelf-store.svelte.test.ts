import { beforeEach, describe, expect, it } from "vitest";
import type { ShelfEntry } from "@codex/entity-shelf";
import { IdbShelfStore } from "./idb-shelf-store.svelte";

function entry(overrides: Partial<ShelfEntry> = {}): ShelfEntry {
  return {
    id: "entry-1",
    groupId: "group-1",
    entityRecord: "---\ntitle: Goblin\n---\nbody",
    sourceEntityId: "goblin",
    sourceVaultId: "vault-a",
    sourceVaultName: "Vault A",
    title: "Goblin",
    type: "creature",
    shelvedAt: 1_000,
    assets: [
      {
        role: "image",
        sourcePath: "images/goblin.webp",
        bytes: new Blob(["x".repeat(2048)], { type: "image/webp" }),
        mimeType: "image/webp",
        originalName: "goblin.webp",
      },
    ],
    statSheetTemplate: null,
    presentationTemplate: null,
    referencedTitles: {},
    byteSize: 2048,
    ...overrides,
  };
}

describe("IdbShelfStore", () => {
  let store: IdbShelfStore;

  beforeEach(async () => {
    store = new IdbShelfStore();
    await store.clear();
    for (const journal of await store.readJournals()) {
      await store.deleteJournal(journal.importId);
    }
  });

  it("lists entries newest first", async () => {
    await store.putEntry(entry({ id: "old", shelvedAt: 1_000 }));
    await store.putEntry(
      entry({ id: "new", sourceEntityId: "orc", shelvedAt: 9_000 }),
    );

    expect((await store.listEntries()).map((e) => e.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("does not load blobs when listing, however large the entries are (FR-022)", async () => {
    await store.putEntry(entry());

    const [summary] = await store.listEntries();
    expect(summary).not.toHaveProperty("assets");
    expect(summary).not.toHaveProperty("entityRecord");
    expect(summary.title).toBe("Goblin");
    expect(summary.sourceVaultName).toBe("Vault A");
  });

  it("shows the same entries whichever vault is open (FR-003)", async () => {
    // The shelf is origin-level, not vault-scoped — that is the entire reason
    // the feature works without files.
    await store.putEntry(entry({ sourceVaultId: "vault-a" }));
    await store.putEntry(
      entry({ id: "entry-2", sourceVaultId: "vault-z", sourceEntityId: "orc" }),
    );

    const listed = await store.listEntries();
    expect(listed).toHaveLength(2);
    expect(new Set(listed.map((e) => e.sourceVaultId))).toEqual(
      new Set(["vault-a", "vault-z"]),
    );
  });

  it("replaces rather than accumulating when the same entity is re-shelved (FR-009, I2)", async () => {
    await store.putEntry(entry({ id: "first", shelvedAt: 1_000 }));
    await store.putEntry(entry({ id: "second", shelvedAt: 2_000 }));

    const listed = await store.listEntries();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("second");
  });

  it("keeps entries for the same entity id from different vaults apart", async () => {
    await store.putEntry(entry({ id: "a", sourceVaultId: "vault-a" }));
    await store.putEntry(entry({ id: "b", sourceVaultId: "vault-b" }));

    expect(await store.listEntries()).toHaveLength(2);
  });

  it("round-trips an entry with its assets attached", async () => {
    await store.putEntry(entry());

    const loaded = await store.getEntry("entry-1");
    expect(loaded?.assets).toHaveLength(1);
    expect(loaded?.assets[0].role).toBe("image");
    expect(loaded?.assets[0].sourcePath).toBe("images/goblin.webp");
    expect(loaded?.assets[0].mimeType).toBe("image/webp");
    // Byte-level round-trip is not asserted here: fake-indexeddb's structured
    // clone under jsdom does not return a Blob with a working `text()`. Real
    // IndexedDB stores Blobs natively, so this is an environment limit rather
    // than a product one — it is covered instead by the manual walk in
    // quickstart.md, where an imported entity's image must actually display.
  });

  it("releases the space removed entries occupied (FR-023)", async () => {
    await store.putEntry(entry());
    expect(await store.totalBytes()).toBe(2048);

    await store.removeEntry("entry-1");
    expect(await store.totalBytes()).toBe(0);
    expect(await store.getEntry("entry-1")).toBeNull();
  });

  it("clears the whole shelf (FR-023)", async () => {
    await store.putEntry(entry());
    await store.putEntry(entry({ id: "entry-2", sourceEntityId: "orc" }));

    await store.clear();
    expect(await store.listEntries()).toEqual([]);
    expect(await store.totalBytes()).toBe(0);
  });

  it("stores an entry whose templates and aliases are Svelte state proxies", async () => {
    // Templates come from $state stores and aliases from the reactive entity
    // map, so a real entry arrives holding proxies — which IndexedDB's
    // structured clone rejects outright with a DataCloneError. In the field
    // that surfaced as a bogus "there may not be enough storage" message.
    const reactive = $state({
      statSheetTemplate: {
        id: "tpl",
        name: "Monster",
        fields: [{ id: "hp", label: "HP", type: "number" }],
      },
      referencedTitles: {
        king: { title: "Goblin King", aliases: ["The Gob"] },
      },
    });

    await expect(
      store.putEntry(
        entry({
          statSheetTemplate: reactive.statSheetTemplate as never,
          referencedTitles: reactive.referencedTitles as never,
        }),
      ),
    ).resolves.toBeUndefined();

    const loaded = await store.getEntry("entry-1");
    expect(loaded?.statSheetTemplate?.name).toBe("Monster");
    expect(loaded?.referencedTitles.king.aliases).toEqual(["The Gob"]);
  });

  it("persists and clears import journals", async () => {
    await store.writeJournal({
      importId: "imp-1",
      vaultId: "vault-b",
      startedAt: 1,
      entityIds: ["goblin"],
      schemaTemplateIds: [],
      presentationTemplateIds: [],
    });

    expect(await store.readJournals()).toHaveLength(1);

    await store.deleteJournal("imp-1");
    expect(await store.readJournals()).toEqual([]);
  });
});
