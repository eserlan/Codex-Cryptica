import { describe, expect, it } from "vitest";
import { makeStore } from "./biome-explorer.test-helpers";

async function savedTundra() {
  const made = makeStore();
  made.store.startFromReference("tundra");
  made.store.setTitle("Ashen Flats");
  made.store.editOwn("vegetation", "Glowing moss");
  expect(await made.store.save()).toBe(true);
  return made;
}

describe("BiomeExplorerStore saving", () => {
  it("creates the profile, renders Markdown content and clears the dirty flag", async () => {
    const { store, vault } = await savedTundra();
    expect(vault.records.size).toBe(1);
    const [record] = [...vault.records.values()];
    expect(record.title).toBe("Ashen Flats");
    expect(record.content).toContain("## My changes");
    expect(record.content).toContain("Glowing moss");
    expect(store.draft?.dirty).toBe(false);
    expect(store.draft?.entityId).toBeDefined();
    expect(store.saveState).toBe("idle");
  });

  it("updates rather than duplicates on the second save", async () => {
    const { store, vault } = await savedTundra();
    store.editOwn("water", "Tidal pools");
    expect(await store.save()).toBe(true);
    expect(vault.records.size).toBe(1);
    expect([...vault.records.values()][0].profile.own.water).toBe(
      "Tidal pools",
    );
  });

  it("trims the name before saving", async () => {
    const made = makeStore();
    made.store.startBlank();
    made.store.setTitle("   Spaced   ");
    await made.store.save();
    expect([...made.vault.records.values()][0].title).toBe("Spaced");
  });

  it("keeps the draft, flags the failure and still allows Markdown export when the vault write fails", async () => {
    const made = makeStore();
    made.store.startFromReference("tundra");
    made.store.setTitle("Ashen Flats");
    made.store.editOwn("vegetation", "Glowing moss");
    made.vault.failWrites = true;
    expect(await made.store.save()).toBe(false);
    expect(made.store.saveState).toBe("failed");
    expect(made.store.saveError).toMatch(/still here/);
    expect(made.store.draft?.dirty).toBe(true);
    expect(made.store.exportDraftMarkdown()).toContain("Glowing moss");

    made.vault.failWrites = false;
    expect(await made.store.save()).toBe(true);
    expect(made.store.saveState).toBe("idle");
    expect(made.vault.records.size).toBe(1);
  });
});

describe("BiomeExplorerStore without a writable vault", () => {
  it("explains why it can't save, keeps the draft and lists nothing", async () => {
    const made = makeStore();
    made.setWritable(false);
    made.store.startFromReference("tundra");
    made.store.setTitle("Ashen Flats");
    expect(await made.store.save()).toBe(false);
    expect(made.store.saveError).toMatch(/Open a vault/);
    expect(made.store.draft).not.toBeNull();
    expect(made.vault.records.size).toBe(0);
    await made.store.refreshProfiles();
    expect(made.store.profiles).toEqual([]);
  });
});

describe("BiomeExplorerStore double actions", () => {
  it("ignores a second save while the first is still running", async () => {
    const made = makeStore();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = made.vault.create.bind(made.vault);
    let calls = 0;
    made.vault.create = async (...args) => {
      calls++;
      await gate;
      return original(...args);
    };
    made.store.startFromReference("tundra");
    made.store.setTitle("Ashen Flats");
    const first = made.store.save();
    expect(made.store.saveState).toBe("saving");
    expect(await made.store.save()).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(calls).toBe(1);
    expect(made.vault.records.size).toBe(1);
  });

  it("keeps the latest profile when two opens overlap", async () => {
    const made = makeStore();
    for (const name of ["First", "Second"]) {
      made.store.startBlank();
      made.store.setTitle(name);
      await made.store.save();
      made.store.discardDraft(true);
    }
    const [firstId, secondId] = [...made.vault.records.keys()];
    const original = made.vault.load.bind(made.vault);
    made.vault.load = async (id) => {
      if (id === firstId)
        await new Promise((resolve) => setTimeout(resolve, 20));
      return original(id);
    };
    const slow = made.store.openProfile(firstId);
    const fast = made.store.openProfile(secondId);
    expect(await fast).toBe(true);
    expect(await slow).toBe(false);
    expect(made.store.draft?.title).toBe("Second");
  });

  it("does not open a profile after the user has discarded in the meantime", async () => {
    const made = makeStore();
    made.store.startBlank();
    made.store.setTitle("Late");
    await made.store.save();
    const id = made.store.draft!.entityId!;
    made.store.discardDraft(true);
    const original = made.vault.load.bind(made.vault);
    made.vault.load = async (loadId) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return original(loadId);
    };
    const pending = made.store.openProfile(id);
    made.store.startBlank();
    expect(await pending).toBe(false);
    expect(made.store.draft?.title).toBe("");
  });
});

describe("BiomeExplorerStore reopening and reuse", () => {
  it("lists saved profiles, then reopens one as a clean draft", async () => {
    const { store } = await savedTundra();
    await store.refreshProfiles();
    expect(store.profiles).toHaveLength(1);
    const id = store.profiles[0].id;
    store.discardDraft(true);
    expect(await store.openProfile(id)).toBe(true);
    expect(store.draft?.title).toBe("Ashen Flats");
    expect(store.draft?.profile.own.vegetation).toBe("Glowing moss");
    expect(store.draft?.dirty).toBe(false);
    expect(store.view).toBe("editor");
  });

  it("reports a profile that cannot be opened and leaves any draft alone", async () => {
    const { store } = makeStore();
    expect(await store.openProfile("missing")).toBe(false);
    expect(store.openError).toMatch(/couldn't open/i);
    expect(store.draft).toBeNull();
  });

  it("makes a copy as a new unsaved draft and leaves the original untouched", async () => {
    const { store, vault } = await savedTundra();
    const originalId = store.draft!.entityId!;
    expect(await store.duplicateProfile(originalId)).toBe(true);
    expect(store.draft?.entityId).toBeUndefined();
    expect(store.draft?.title).toBe("Ashen Flats (copy)");
    expect(store.draft?.dirty).toBe(true);
    store.editOwn("vegetation", "Something else");
    await store.save();
    expect(vault.records.size).toBe(2);
    expect(vault.records.get(originalId)?.profile.own.vegetation).toBe(
      "Glowing moss",
    );
  });

  it("keeps a profile usable after its reference biome is gone from the catalogue", async () => {
    const { store, vault } = await savedTundra();
    const id = store.draft!.entityId!;
    vault.records.get(id)!.profile.reference!.biomeId = "removed-biome";
    store.discardDraft(true);
    expect(await store.openProfile(id)).toBe(true);
    expect(store.exportDraftMarkdown()).toContain("## Reference");
  });
});

describe("BiomeExplorerStore deleting", () => {
  it("needs confirmation and only deletes once confirmed", async () => {
    const { store, vault } = await savedTundra();
    const id = store.draft!.entityId!;
    store.requestDelete(id);
    expect(store.deletePendingId).toBe(id);
    expect(vault.records.size).toBe(1);
    store.cancelDelete();
    expect(store.deletePendingId).toBeNull();
    expect(vault.records.size).toBe(1);

    store.requestDelete(id);
    expect(await store.confirmDelete()).toBe(true);
    expect(vault.records.size).toBe(0);
    expect(store.deletePendingId).toBeNull();
  });

  it("keeps the profile and says so when the delete fails", async () => {
    const { store, vault } = await savedTundra();
    const id = store.draft!.entityId!;
    vault.failWrites = true;
    store.requestDelete(id);
    expect(await store.confirmDelete()).toBe(false);
    expect(store.openError).toMatch(/couldn't delete/i);
    expect(vault.records.size).toBe(1);
  });
});

describe("BiomeExplorerStore copying Markdown", () => {
  it("copies the draft as Markdown", async () => {
    const { store, copied } = await savedTundra();
    const result = await store.copyMarkdown();
    expect(result.ok).toBe(true);
    expect(copied[0]).toContain("# Ashen Flats");
  });

  it("returns the text for the user to copy by hand when the clipboard is unavailable", async () => {
    const { store, breakClipboard } = await savedTundra();
    breakClipboard();
    const result = await store.copyMarkdown();
    expect(result.ok).toBe(false);
    expect(result.text).toContain("# Ashen Flats");
    expect(store.copyFallbackText).toContain("# Ashen Flats");
  });

  it("copies a library biome as Markdown", async () => {
    const { store, copied } = makeStore();
    const result = await store.copyReferenceMarkdown("tundra");
    expect(result.ok).toBe(true);
    expect(copied[0].startsWith("# Tundra")).toBe(true);
    expect((await store.copyReferenceMarkdown("nope")).ok).toBe(false);
  });

  it("uses a placeholder name for an unnamed draft export", () => {
    const { store } = makeStore();
    store.startBlank();
    expect(store.exportDraftMarkdown()).toContain("# Untitled biome");
    expect(store.markdownFilename()).toBe("untitled-biome.md");
  });
});
