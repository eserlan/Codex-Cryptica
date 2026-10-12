/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  SHOP_MERCHANT_TEMPLATE,
  createDemoMerchantSheet,
  getShopPresentationTemplates,
} from "@codex/stat-sheet-engine";

const { updateEntity, vaultState } = vi.hoisted(() => ({
  updateEntity: vi.fn(),
  vaultState: { isGuest: false },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get isGuest() {
      return vaultState.isGuest;
    },
    updateEntity,
    entities: {},
    allEntities: [],
  },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));
vi.mock("$lib/stores/stat-sheet-templates.svelte", () => ({
  statSheetTemplates: {
    allTemplates: [SHOP_MERCHANT_TEMPLATE],
    availableTemplates: [SHOP_MERCHANT_TEMPLATE],
    getDefaultPresentationTemplateId: () => null,
  },
}));
vi.mock("$lib/stores/presentation-templates.svelte", () => ({
  presentationTemplates: {
    availableTemplatesForSchema: () => getShopPresentationTemplates(),
  },
}));
vi.mock("$lib/services/merchant-trade-instance", () => ({
  merchantTradeService: { execute: vi.fn() },
}));

import DetailStatsTab from "./DetailStatsTab.svelte";

const [gmLayout, catalogueLayout] = getShopPresentationTemplates();

function shop(presentationTemplateId: string): Entity {
  return {
    id: "shop-1",
    type: "location",
    title: "Tallow's Goods",
    tags: [],
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    statSheet: { ...createDemoMerchantSheet(), presentationTemplateId },
  } as unknown as Entity;
}

describe("a shop on the Stats tab (#3962, #3963)", () => {
  it("offers Trade on each visible line in the GM Stock Manager, with the shop as the entity", async () => {
    render(DetailStatsTab, { entity: shop(gmLayout.id) });

    // The hidden demo line is still a line the GM can trade or edit.
    const trade = screen.getAllByRole("button", { name: /^Trade / });
    expect(trade.length).toBe(5);

    await fireEvent.click(trade[0]);
    expect(screen.getByTestId("stock-trade-panel")).toBeTruthy();
    // Opening a trade form does not save anything.
    expect(updateEntity).not.toHaveBeenCalled();
  });

  it("offers no Trade control and hides the hidden line in the Browse Catalogue", () => {
    render(DetailStatsTab, { entity: shop(catalogueLayout.id) });

    expect(screen.queryAllByRole("button", { name: /^Trade / })).toHaveLength(
      0,
    );
    expect(screen.queryByText(/Signet ring/)).toBeNull();
    expect(screen.queryByText(/Do not mention/)).toBeNull();
    expect(screen.getByText(/Hempen rope/)).toBeTruthy();
  });

  it("offers no Trade control in a read-only (guest) vault", () => {
    vaultState.isGuest = true;
    try {
      render(DetailStatsTab, { entity: shop(gmLayout.id) });
      expect(screen.queryAllByRole("button", { name: /^Trade / })).toHaveLength(
        0,
      );
    } finally {
      vaultState.isGuest = false;
    }
  });
});
