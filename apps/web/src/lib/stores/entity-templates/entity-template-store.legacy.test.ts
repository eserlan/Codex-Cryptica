import { describe, it, expect, vi } from "vitest";
import { makeRepository, makeStore } from "./test-helpers";

const withLegacy = async (
  legacy: { type: string; markdown: string }[],
  defaults = {},
) => {
  const repository = makeRepository({
    loadAll: vi.fn().mockResolvedValue({
      templates: [],
      defaults: { version: 1, defaults },
      legacy,
      warnings: [],
    }),
  } as any);
  const ctx = makeStore({ repository });
  await ctx.store.loadForVault("v1", { vault: ctx.vault });
  return ctx;
};

describe("EntityTemplateStore: legacy files", () => {
  it("lists a legacy file as a read-only file template", async () => {
    const { store } = await withLegacy([{ type: "character", markdown: "X" }]);
    const row = store.list.find((t) => t.id === "legacy:character")!;
    expect(row.source).toBe("legacy");
    expect(row.markdown).toBe("X");
  });

  it("uses it for new entities when no default is chosen", async () => {
    const { store } = await withLegacy([
      { type: "character", markdown: "## Cyberware\n" },
    ]);
    expect(store.resolveSync("character")).toBe("## Cyberware\n");
  });

  it("an empty legacy file means a blank note", async () => {
    const { store } = await withLegacy([{ type: "location", markdown: "" }]);
    expect(store.resolveSync("location")).toBe("");
  });

  it("a chosen default beats the legacy file", async () => {
    const { store } = await withLegacy(
      [{ type: "character", markdown: "LEGACY" }],
      { character: "builtin:character" },
    );
    expect(store.resolveSync("character")).not.toBe("LEGACY");
  });

  it("never edits or deletes the legacy file", async () => {
    const { store, repository } = await withLegacy([
      { type: "character", markdown: "X" },
    ]);
    await expect(
      store.update("legacy:character", {
        name: "n",
        entityType: "character",
        markdown: "t",
      }),
    ).rejects.toThrow();
    await expect(store.remove("legacy:character")).rejects.toThrow();
    expect(repository.deleteTemplate).not.toHaveBeenCalled();
  });

  it("exports a legacy file with its markdown", async () => {
    const { store } = await withLegacy([
      { type: "character", markdown: "## A\nb\n" },
    ]);
    const pkg = store.exportPackage("legacy:character");
    expect(pkg.template.markdown).toBe("## A\nb\n");
  });
});
