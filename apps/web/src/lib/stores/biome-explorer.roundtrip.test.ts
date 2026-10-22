import { describe, expect, it } from "vitest";
import { makeStore } from "./biome-explorer.test-helpers";

describe("BiomeExplorerStore round trips (SC-005)", () => {
  it("loses nothing across 20 create, save, load, edit, save, render cycles", async () => {
    const { store, vault } = makeStore();
    store.startFromReference("tundra");
    store.setTitle("Round Trip");
    const referenceAtStart = JSON.stringify(store.draft!.profile.reference);

    for (let i = 1; i <= 20; i++) {
      store.editOwn("vegetation", `Moss variety ${i}`);
      store.editOwn("notes", `Note ${i}`);
      expect(await store.save()).toBe(true);
      const id = store.draft!.entityId!;
      store.discardDraft(true);
      expect(await store.openProfile(id)).toBe(true);

      const profile = store.draft!.profile;
      expect(profile.own.vegetation).toBe(`Moss variety ${i}`);
      expect(profile.own.notes).toBe(`Note ${i}`);
      expect(JSON.stringify(profile.reference)).toBe(referenceAtStart);
      expect(store.exportDraftMarkdown()).toContain(`Moss variety ${i}`);
    }
    expect(vault.records.size).toBe(1);
  });
});
