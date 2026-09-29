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

describe("installing a community template never touches entities or defaults (SC-003, SC-005)", () => {
  it("only writes the one new template file", async () => {
    const { installEntityTemplate } = await import("./entity-template-install");
    const { store, repository, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    await store.setDefault("character", "builtin:character");
    (repository.saveDefaults as any).mockClear();

    const result = await installEntityTemplate(
      {
        service: {
          downloadEntityTemplatePackage: async () => ({
            kind: "entity-template" as const,
            formatVersion: 1,
            template: {
              name: "Guild Hall",
              entityType: "character",
              markdown: "## x\n",
            },
          }),
        },
        store,
        getKnownTypes: () => ["character"],
      },
      { listingId: "l1" },
    );

    expect(result.status).toBe("installed");
    expect((repository.saveTemplate as any).mock.calls).toHaveLength(1);
    expect(repository.saveDefaults).not.toHaveBeenCalled();
    expect(repository.deleteTemplate).not.toHaveBeenCalled();
    expect(store.defaultFor("character")).toBe("builtin:character");
    for (const args of (repository.saveTemplate as any).mock.calls) {
      expect(args[0]).toBe(vault);
    }
  });
});
