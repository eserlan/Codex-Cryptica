/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import {
  SHOP_MERCHANT_TEMPLATE,
  createDemoMerchantSheet,
  sanitizeSheetForGuests,
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
  describe("what a guest sees (#3964)", () => {
    function guestShop(published: boolean) {
      const demo = createDemoMerchantSheet();
      const ledger = demo.fields.find((f) => f.id === "stock")!;
      ledger.playerCatalogue = { published, fields: ["services"] };
      return {
        ...shop(gmLayout.id),
        // Exactly what the host sends: the sanitised sheet, nothing else.
        statSheet: sanitizeSheetForGuests(demo),
      } as unknown as Entity;
    }

    it("shows only the published catalogue, read-only, with no GM controls", () => {
      vaultState.isGuest = true;
      try {
        render(DetailStatsTab, { entity: guestShop(true) });

        expect(screen.getByText(/Hempen rope/)).toBeTruthy();
        // Long text is shown in a disabled box, so it is matched by its value.
        const services = screen.getByDisplayValue(/Repairs to packs/);
        expect((services as HTMLTextAreaElement).disabled).toBe(true);
        // Hidden line, line notes, GM notes and purchasing power never arrive.
        for (const secret of [
          "Signet ring",
          "Do not mention",
          "back room",
          "About 200 gp",
        ]) {
          expect(screen.queryByText(new RegExp(secret))).toBeNull();
        }
        expect(
          screen.queryAllByRole("button", { name: /^Trade / }),
        ).toHaveLength(0);
        expect(screen.queryByTestId("shop-sharing")).toBeNull();
        expect(screen.queryByTestId("item-table-add-row")).toBeNull();
        expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
      } finally {
        vaultState.isGuest = false;
      }
    });

    it("shows a guest nothing for a shop that is not shared", () => {
      vaultState.isGuest = true;
      try {
        render(DetailStatsTab, { entity: guestShop(false) });
        expect(screen.queryByText(/Hempen rope/)).toBeNull();
        expect(screen.queryByText(/back room/)).toBeNull();
        expect(updateEntity).not.toHaveBeenCalled();
      } finally {
        vaultState.isGuest = false;
      }
    });
  });
});
