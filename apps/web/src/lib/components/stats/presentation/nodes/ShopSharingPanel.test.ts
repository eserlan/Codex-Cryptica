/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("$lib/utils/stat-sheet-field-actions", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
vi.mock("$lib/services/merchant-trade-instance", () => ({
  merchantTradeService: { execute: vi.fn() },
}));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: { lantern: { id: "lantern", title: "Hooded Lantern" } },
    allEntities: [],
  },
}));

import ShopSharingPanel from "./ShopSharingPanel.svelte";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

function sheet(playerCatalogue?: StatSheetField["playerCatalogue"]) {
  const stock = {
    id: "stock",
    label: "Stock",
    type: "item-table",
    stockLedger: true,
    columns: [{ id: "name", label: "Item", type: "text" }],
    ...(playerCatalogue ? { playerCatalogue } : {}),
    rows: [
      {
        rowId: "rope",
        name: "Rope",
        stock: { quantity: 2, price: gp(1), note: "CANARY-LINE-NOTE" },
      },
      {
        rowId: "lamp",
        entityId: "lantern",
        stock: { quantity: 1, price: gp(5) },
      },
      {
        rowId: "ring",
        name: "CANARY-HIDDEN-LINE",
        stock: { availability: "hidden" },
      },
    ],
  } as unknown as StatSheetField;
  const fields: StatSheetField[] = [
    { id: "owner", label: "Owner / manager", type: "text", value: "Brannoch" },
    { id: "speciality", label: "Speciality", type: "text", value: "Lamp oil" },
    {
      id: "funds",
      label: "Purchasing power",
      type: "text",
      value: "CANARY-FUNDS",
    },
    { id: "gm_notes", label: "GM notes", type: "longtext", value: "CANARY-GM" },
    stock,
  ];
  return { fields, stock };
}

function setup(playerCatalogue?: StatSheetField["playerCatalogue"]) {
  const { fields, stock } = sheet(playerCatalogue);
  const onUpdateField = vi.fn();
  const context = {
    fields,
    readOnly: false,
    entityId: "shop",
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField,
    onAdjustCounter: vi.fn(),
  } as PresentationRenderContext;
  render(ShopSharingPanel, { props: { field: stock, context } });
  return { onUpdateField };
}

const toggle = () =>
  screen.getByTestId("shop-share-toggle") as HTMLInputElement;

describe("ShopSharingPanel sharing controls (#3964)", () => {
  it("is private by default and says so", () => {
    setup();
    expect(toggle().checked).toBe(false);
    expect(screen.getByTestId("shop-sharing").textContent).toContain(
      "Nothing about this shop is sent to players",
    );
    expect(screen.queryByTestId("shop-share-detail-owner")).toBeNull();
  });

  it("publishes only when the GM ticks the box", async () => {
    const { onUpdateField } = setup();
    expect(onUpdateField).not.toHaveBeenCalled();
    await fireEvent.click(toggle());
    expect(onUpdateField).toHaveBeenCalledWith("stock", {
      playerCatalogue: { published: true, fields: [] },
    });
  });

  it("offers only business details the sheet has and players may be shown", () => {
    setup({ published: true, fields: [] });
    expect(screen.getByTestId("shop-share-detail-owner")).toBeTruthy();
    expect(screen.getByTestId("shop-share-detail-speciality")).toBeTruthy();
    // Purchasing power and GM notes can never be shared, so are never offered.
    expect(screen.queryByTestId("shop-share-detail-funds")).toBeNull();
    expect(screen.queryByTestId("shop-share-detail-gm_notes")).toBeNull();
    expect(
      (screen.getByTestId("shop-sharing").textContent ?? "").replace(
        /\s+/g,
        " ",
      ),
    ).toContain("They cannot buy or change anything");
  });

  it("adds and removes a chosen detail", async () => {
    const { onUpdateField } = setup({ published: true, fields: ["owner"] });
    await fireEvent.click(screen.getByTestId("shop-share-detail-speciality"));
    expect(onUpdateField).toHaveBeenLastCalledWith("stock", {
      playerCatalogue: { published: true, fields: ["owner", "speciality"] },
    });
    await fireEvent.click(screen.getByTestId("shop-share-detail-owner"));
    expect(onUpdateField).toHaveBeenLastCalledWith("stock", {
      playerCatalogue: { published: true, fields: [] },
    });
  });

  it("stops sharing when the box is unticked", async () => {
    const { onUpdateField } = setup({ published: true, fields: ["owner"] });
    await fireEvent.click(toggle());
    expect(onUpdateField).toHaveBeenCalledWith("stock", {
      playerCatalogue: { published: false, fields: ["owner"] },
    });
  });
});

describe("Preview as player", () => {
  const open = () => fireEvent.click(screen.getByTestId("shop-preview-toggle"));
  const preview = () => screen.getByTestId("player-preview");

  it("says players see nothing when the shop is not shared", async () => {
    setup();
    await open();
    expect(screen.getByTestId("player-preview-empty").textContent).toContain(
      "not shared",
    );
  });

  it("shows exactly the shared catalogue and none of the private data", async () => {
    setup({ published: true, fields: ["speciality"] });
    await open();
    const text = preview().textContent ?? "";
    expect(text).toContain("Lamp oil");
    expect(text).toContain("Rope");
    // A line with no name of its own shows its linked Item's title.
    expect(text).toContain("Hooded Lantern");
    for (const secret of [
      "CANARY-LINE-NOTE",
      "CANARY-HIDDEN-LINE",
      "CANARY-FUNDS",
      "CANARY-GM",
      "Brannoch",
    ]) {
      expect(text, secret).not.toContain(secret);
    }
  });

  it("has no controls: players can only look", async () => {
    setup({ published: true, fields: [] });
    await open();
    expect(preview().querySelectorAll("button")).toHaveLength(0);
    expect(preview().querySelectorAll("input, select")).toHaveLength(0);
  });

  it("opens and closes with the button", async () => {
    setup({ published: true, fields: [] });
    const button = screen.getByTestId("shop-preview-toggle");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await open();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    await open();
    expect(screen.queryByTestId("player-preview")).toBeNull();
  });
});
