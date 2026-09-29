import { describe, it, expect } from "vitest";
import { makeStore, draft } from "./test-helpers";

describe("templates never touch entities (FR-017, SC-003)", () => {
  it("editing, deleting and re-defaulting only call the template repository", async () => {
    const { store, repository, vault } = makeStore();
    await store.loadForVault("v1", { vault });

    // The store's only collaborators are the injected deps: a repository that
    // reads/writes template files, a theme lookup, an id source and a notifier.
    const t = await store.create(draft());
    await store.setDefault("character", t.id);
    await store.update(t.id, draft({ name: "Renamed" }));
    await store.duplicate(t.id);
    await store.remove(t.id);

    const calls = [
      ...(repository.saveTemplate as any).mock.calls,
      ...(repository.saveDefaults as any).mock.calls,
      ...(repository.deleteTemplate as any).mock.calls,
    ];
    for (const args of calls) {
      expect(args[0]).toBe(vault);
    }
  });
});
