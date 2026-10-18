import { describe, it, expect } from "vitest";
import { makeStore, draft } from "./test-helpers";

const setup = async (opts = {}) => {
  const ctx = makeStore(opts);
  await ctx.store.loadForVault("v1", { vault: ctx.vault });
  return ctx;
};

describe("EntityTemplateStore: import and export", () => {
  it("exports built-in, legacy-free and user templates as valid packages", async () => {
    const { store } = await setup();
    const mine = await store.create(draft());
    for (const id of ["builtin:character", mine.id]) {
      const pkg = store.exportPackage(id);
      expect(pkg.kind).toBe("entity-template");
      expect(pkg.template.markdown.length).toBeGreaterThan(0);
    }
    expect(() => store.exportPackage("gone")).toThrow();
  });

  it("imports as a new user template with a new id, never overwriting", async () => {
    const source = await setup();
    const mine = await source.store.create(draft({ name: "Settlement" }));
    const pkg = source.store.exportPackage(mine.id);

    const target = await setup({ ids: ["imported-1"] });
    const r = await target.store.importPackage(JSON.parse(JSON.stringify(pkg)));
    expect(r.ok).toBe(true);
    const listed = target.store.list.find((t) => t.id === "imported-1");
    expect(listed?.name).toBe("Settlement");
    expect(listed?.source).toBe("user");
  });

  it("keeps both when an import has the same name, and marks the imported one", async () => {
    const { store } = await setup();
    const mine = await store.create(draft({ name: "Same" }));
    const r = await store.importPackage(store.exportPackage(mine.id));
    expect(r.ok).toBe(true);
    const names = store.list
      .filter((t) => t.entityType === "character")
      .map((t) => t.name);
    expect(names).toContain("Same");
    expect(names).toContain("Same (imported)");
  });

  it("rejects an invalid file and changes nothing", async () => {
    const { store, repository } = await setup();
    const before = store.list.length;
    for (const raw of [
      null,
      "x",
      { kind: "other" },
      { kind: "entity-template", formatVersion: 99, template: {} },
    ]) {
      const r = await store.importPackage(raw);
      expect(r.ok).toBe(false);
    }
    expect(store.list).toHaveLength(before);
    expect(repository.saveTemplate).not.toHaveBeenCalled();
  });
});
