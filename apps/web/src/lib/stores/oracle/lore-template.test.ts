import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveSync } = vi.hoisted(() => ({ resolveSync: vi.fn() }));

vi.mock("../entity-templates/entity-template-store.svelte", () => ({
  entityTemplateStore: { resolveSync },
}));

import { withLoreTemplate } from "./lore-template";

describe("withLoreTemplate", () => {
  beforeEach(() => {
    resolveSync.mockReset();
    resolveSync.mockReturnValue("## From the vault\n");
  });

  it("adds the vault template for the entity type, using the given theme", () => {
    const out = withLoreTemplate("character", { themeId: "fantasy" });
    expect(resolveSync).toHaveBeenCalledWith("character", "fantasy");
    expect(out).toEqual({
      themeId: "fantasy",
      loreTemplate: "## From the vault\n",
    });
  });

  it("keeps the other options untouched", () => {
    const out = withLoreTemplate("faction", {
      instructions: "Make it grim",
      priority: "instructions-first",
    } as any);
    expect(out).toMatchObject({
      instructions: "Make it grim",
      priority: "instructions-first",
      loreTemplate: "## From the vault\n",
    });
  });

  it("passes a blank template through so a blank vault template stays blank", () => {
    resolveSync.mockReturnValue("");
    expect(withLoreTemplate("note", {}).loreTemplate).toBe("");
  });

  it("does not override a template the caller already supplied", () => {
    const out = withLoreTemplate("character", { loreTemplate: "mine" });
    expect(out.loreTemplate).toBe("mine");
    expect(resolveSync).not.toHaveBeenCalled();
  });

  it("does nothing without an entity type", () => {
    const options = { themeId: "x" };
    expect(withLoreTemplate(undefined, options)).toBe(options);
    expect(withLoreTemplate(undefined)).toEqual({});
    expect(resolveSync).not.toHaveBeenCalled();
  });
});
