import { describe, it, expect, vi } from "vitest";
import { makeStore, draft, makeRepository } from "./test-helpers";
import { EntityTemplateError } from "./entity-template-store.svelte";

const setup = async (opts = {}) => {
  const ctx = makeStore(opts);
  await ctx.store.loadForVault("v1", { vault: ctx.vault });
  return ctx;
};

describe("EntityTemplateStore: create", () => {
  it("persists a valid draft with a generated id", async () => {
    const { store, repository, vault } = await setup({ ids: ["new-id"] });
    const t = await store.create(
      draft({ name: "  Mine  ", entityType: "Character" }),
    );
    expect(t.id).toBe("new-id");
    expect(t.name).toBe("Mine");
    expect(t.entityType).toBe("character");
    expect(repository.saveTemplate).toHaveBeenCalledWith(
      vault,
      expect.objectContaining({ id: "new-id", version: 1 }),
    );
    expect(store.list.find((x) => x.id === "new-id")?.source).toBe("user");
  });

  it("rejects an invalid draft with the validation issues", async () => {
    const { store, repository } = await setup();
    const err = await store
      .create(draft({ name: " ", sections: [] }))
      .catch((e) => e);
    expect(err).toBeInstanceOf(EntityTemplateError);
    expect(err.issues.length).toBeGreaterThan(0);
    expect(repository.saveTemplate).not.toHaveBeenCalled();
  });

  it("keeps two templates with the same name for one type", async () => {
    const { store } = await setup();
    const a = await store.create(draft());
    const b = await store.create(draft());
    expect(a.id).not.toBe(b.id);
    expect(store.list.filter((t) => t.name === "Mine")).toHaveLength(2);
  });

  it("lists a template under a custom category even after that category is gone", async () => {
    const { store } = await setup();
    await store.create(draft({ name: "Ship", entityType: "starship" }));
    expect(store.list.find((t) => t.entityType === "starship")?.name).toBe(
      "Ship",
    );
  });
});

describe("EntityTemplateStore: duplicate", () => {
  it("copies a built-in into an editable user template with a new id", async () => {
    const { store } = await setup({ ids: ["copy-1"] });
    const copy = await store.duplicate("builtin:faction");
    expect(copy.id).toBe("copy-1");
    expect(copy.source).toBe("user");
    expect(copy.name).toBe("Standard Faction (copy)");
    expect(copy.sections.length).toBeGreaterThan(0);
  });

  it("parses a legacy file into sections and leaves the file alone", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue({
        templates: [],
        defaults: { version: 1, defaults: {} },
        legacy: [{ type: "character", markdown: "## Cyberware\nImplants.\n" }],
        warnings: [],
      }),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    const copy = await store.duplicate("legacy:character");
    expect(copy.sections.map((s) => s.title)).toEqual(["Cyberware"]);
    expect(repository.deleteTemplate).not.toHaveBeenCalled();
    expect(store.list.some((t) => t.id === "legacy:character")).toBe(true);
  });

  it("seeds one section when the source is an empty file", async () => {
    const repository = makeRepository({
      loadAll: vi.fn().mockResolvedValue({
        templates: [],
        defaults: { version: 1, defaults: {} },
        legacy: [{ type: "location", markdown: "" }],
        warnings: [],
      }),
    } as any);
    const { store, vault } = makeStore({ repository });
    await store.loadForVault("v1", { vault });
    const copy = await store.duplicate("legacy:location");
    expect(copy.sections).toHaveLength(1);
  });

  it("refuses an unknown id", async () => {
    const { store } = await setup();
    await expect(store.duplicate("gone")).rejects.toThrow();
  });
});

describe("EntityTemplateStore: update and remove", () => {
  it("update persists, keeps the id, and changes only future resolution", async () => {
    const { store, repository } = await setup();
    const t = await store.create(draft());
    await store.setDefault("character", t.id);
    const before = store.resolveSync("character");

    await store.update(
      t.id,
      draft({ sections: [{ id: "z", title: "Changed" }] }),
    );
    expect(repository.saveTemplate).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ id: t.id }),
    );
    expect(before).toContain("## Summary");
    expect(store.resolveSync("character")).toContain("## Changed");
  });

  it("refuses to edit built-in or legacy templates", async () => {
    const { store, repository } = await setup();
    await expect(store.update("builtin:character", draft())).rejects.toThrow();
    await expect(store.update("legacy:character", draft())).rejects.toThrow();
    await expect(store.remove("builtin:character")).rejects.toThrow();
    expect(repository.saveTemplate).not.toHaveBeenCalled();
    expect(repository.deleteTemplate).not.toHaveBeenCalled();
  });

  it("rejects an invalid update and keeps the old template", async () => {
    const { store } = await setup();
    const t = await store.create(draft());
    await expect(
      store.update(t.id, draft({ name: "" })),
    ).rejects.toBeInstanceOf(EntityTemplateError);
    expect(store.list.find((x) => x.id === t.id)?.name).toBe("Mine");
  });

  it("removing the chosen default falls back to the built-in", async () => {
    const { store, repository, vault } = await setup();
    const t = await store.create(draft());
    await store.setDefault("character", t.id);
    await store.remove(t.id);
    expect(repository.deleteTemplate).toHaveBeenCalledWith(vault, t.id);
    expect(store.defaultFor("character")).toBeUndefined();
    expect(store.effectiveDefaultFor("character")).toBe("builtin:character");
  });

  it("removing a non-default template leaves defaults alone", async () => {
    const { store, repository } = await setup();
    const t = await store.create(draft());
    (repository.saveDefaults as any).mockClear();
    await store.remove(t.id);
    expect(repository.saveDefaults).not.toHaveBeenCalled();
  });

  it("changing a default template's type clears it as the old type's default", async () => {
    const { store, repository } = await setup();
    const t = await store.create(draft());
    await store.setDefault("character", t.id);
    await store.update(t.id, draft({ entityType: "location" }));
    expect(store.defaultFor("character")).toBeUndefined();
    expect(repository.saveDefaults).toHaveBeenLastCalledWith(
      expect.anything(),
      { version: 1, defaults: {} },
    );
    expect(store.effectiveDefaultFor("character")).toBe("builtin:character");
  });

  it("keeps the template when the delete fails", async () => {
    const { store, repository, notify } = await setup();
    const t = await store.create(draft());
    (repository.deleteTemplate as any).mockRejectedValueOnce(
      new Error("locked"),
    );
    await expect(store.remove(t.id)).rejects.toThrow("locked");
    expect(store.list.some((x) => x.id === t.id)).toBe(true);
    expect(notify).toHaveBeenCalledWith(expect.any(String), "error");
  });
});
