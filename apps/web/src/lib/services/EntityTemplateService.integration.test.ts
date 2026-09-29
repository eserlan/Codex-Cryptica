import { describe, it, expect } from "vitest";
import { EntityTemplateService } from "./EntityTemplateService.svelte";
import { makeStore } from "../stores/entity-templates/test-helpers";

// Every creation path (new entity dialog, mobile sheet, related-entity dialog,
// generators) goes through `entityTemplateService.resolveTemplate`, so one
// vault default has to show up in all of them, including callers that pass no
// folder handle or theme (the related-entity dialog used to ignore vault templates).
describe("vault templates reach every creation path (FR-019)", () => {
  const setup = async () => {
    const ctx = makeStore();
    await ctx.store.loadForVault("v1", { vault: ctx.vault });
    const mine = await ctx.store.create({
      name: "Cyber faction",
      entityType: "faction",
      sections: [{ id: "a", title: "Corporate ties", hint: "Who pays them." }],
    });
    await ctx.store.setDefault("faction", mine.id);
    const service = new EntityTemplateService({
      themeStore: { worldThemeId: "workspace" },
      templateStore: ctx.store,
    });
    return { ...ctx, service };
  };

  const expected = "## Corporate ties\n\nWho pays them.\n";

  it.each([
    [
      "with a folder handle and theme (new entity dialog, mobile sheet)",
      ["faction", "workspace", {}],
    ],
    ["with no handle and no theme (related-entity dialog)", ["faction"]],
    ["with only a type (generator fallback)", ["Faction"]],
  ] as const)("returns the vault default %s", async (_label, args) => {
    const { service } = await setup();
    expect(await (service.resolveTemplate as any)(...args)).toBe(expected);
  });

  it("leaves other types on their built-in template", async () => {
    const { service } = await setup();
    expect(await service.resolveTemplate("location")).toContain("## Summary");
  });

  it("falls back to the built-in template when the default is deleted", async () => {
    const { service, store } = await setup();
    const id = store.defaultFor("faction")!;
    await store.remove(id);
    expect(await service.resolveTemplate("faction")).not.toBe(expected);
    expect(await service.resolveTemplate("faction")).toContain("## Summary");
  });
});
