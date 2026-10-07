import { describe, it, expect } from "vitest";
import { makeStore } from "./test-helpers";

describe("EntityTemplateStore: defaults", () => {
  it("persists a chosen default and moves the Default marker", async () => {
    const { store, repository, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    const mine = await store.create({
      name: "Mine",
      entityType: "character",
      markdown: "## A\n",
    });
    expect(store.effectiveDefaultFor("character")).toBe("builtin:character");

    await store.setDefault("character", mine.id);
    expect(repository.saveDefaults).toHaveBeenLastCalledWith(vault, {
      version: 1,
      defaults: { character: mine.id },
    });
    expect(store.effectiveDefaultFor("character")).toBe(mine.id);

    await store.setDefault("character", "builtin:character");
    expect(store.effectiveDefaultFor("character")).toBe("builtin:character");
  });

  it("rejects an unknown template id", async () => {
    const { store, repository, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    await expect(store.setDefault("character", "nope")).rejects.toThrow();
    expect(repository.saveDefaults).not.toHaveBeenCalled();
  });

  it("rejects a template that belongs to another type", async () => {
    const { store, repository, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    await expect(
      store.setDefault("character", "builtin:location"),
    ).rejects.toThrow();
    expect(repository.saveDefaults).not.toHaveBeenCalled();
  });

  it("leaves the default unchanged when the write fails", async () => {
    const { store, repository, notify, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    (repository.saveDefaults as any).mockRejectedValueOnce(new Error("disk"));
    const mine = await store.create({
      name: "Mine",
      entityType: "location",
      markdown: "## A\n",
    });
    await expect(store.setDefault("location", mine.id)).rejects.toThrow();
    expect(store.defaultFor("location")).toBeUndefined();
    expect(notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("keeps Standard Character as the default until Table Card is chosen", async () => {
    const { store, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    expect(store.effectiveDefaultFor("character")).toBe("builtin:character");
    expect(store.resolveSync("character")).not.toContain("The Six Elements");

    await store.setDefault("character", "builtin:character:table-card");
    expect(store.effectiveDefaultFor("character")).toBe(
      "builtin:character:table-card",
    );
    expect(store.resolveSync("character")).toContain("## The Six Elements");
  });

  it("can duplicate Table Card into an editable copy", async () => {
    const { store, vault } = makeStore();
    await store.loadForVault("v1", { vault });
    const copy = await store.duplicate("builtin:character:table-card");
    expect(copy.source).toBe("user");
    expect(copy.markdown).toBe(
      store.previewMarkdown("builtin:character:table-card"),
    );
    await expect(
      store.update("builtin:character:table-card", {
        name: "x",
        entityType: "character",
        markdown: "",
      }),
    ).rejects.toThrow();
  });
});
