/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("./vault-registry.svelte", () => ({
  vaultRegistry: { activeVaultId: "vault-1" },
}));

vi.mock("./stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    getDefaultPresentationTemplateId: () => null,
    setDefaultPresentationTemplate: vi.fn(),
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    put: vi.fn(),
    delete: vi.fn(),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
  }),
}));

import { SHOP_MERCHANT_TEMPLATE_ID } from "@codex/stat-sheet-engine";
import { PresentationTemplateStore } from "./presentation-templates.svelte";
import { BUILT_IN_STAT_SHEET_TEMPLATES } from "./stat-sheet/built-in-templates";

function makeStore() {
  return new PresentationTemplateStore(
    { uuid: vi.fn(() => "id-1") },
    { now: () => 0 },
  );
}

describe("Shop / Merchant built-in sheet (#3962)", () => {
  it("is offered as a built-in stat sheet template, once", () => {
    const matches = BUILT_IN_STAT_SHEET_TEMPLATES.filter(
      (template) => template.id === SHOP_MERCHANT_TEMPLATE_ID,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      name: "Shop / Merchant",
      isBuiltIn: true,
      category: "location",
    });
  });

  it("offers the GM Stock Manager and Browse Catalogue layouts for the shop", () => {
    const available = makeStore().availableTemplatesForSchema(
      SHOP_MERCHANT_TEMPLATE_ID,
    );
    expect(available.map((template) => template.name)).toEqual([
      "GM Stock Manager",
      "Browse Catalogue",
    ]);
  });

  it("does not leak the shop layouts into other sheets", () => {
    const available = makeStore().availableTemplatesForSchema(
      "builtin-dnd-character",
    );
    const names = available.map((template) => template.name);
    expect(names).not.toContain("GM Stock Manager");
    expect(names).not.toContain("Browse Catalogue");
  });
});
