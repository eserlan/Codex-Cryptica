import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity, StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { entities: {}, allEntities: [] },
}));
import ItemTableToolbar from "./ItemTableToolbar.svelte";

function props() {
  return {
    field: {
      id: "items",
      label: "Equipment",
      type: "item-table",
    } as StatSheetField,
    context: { readOnly: false, mode: "view" } as PresentationRenderContext,
    entities: [
      { id: "sword", title: "Sword", type: "WEAPON" },
      { id: "bag", title: "Bag", type: "adventuring gear" },
      { id: "npc", title: "Merchant", type: "npc" },
    ] as Entity[],
    tradingEnabled: false,
    onAddRow: vi.fn(),
    onLinkItem: vi.fn(),
  };
}

describe("ItemTableToolbar", () => {
  it("adds rows and links only eligible vault items, then closes the picker", async () => {
    const p = props();
    render(ItemTableToolbar, { props: p });
    await fireEvent.click(screen.getByTestId("item-table-add-row"));
    expect(p.onAddRow).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByTestId("item-table-link-item"));
    expect(screen.getByRole("option", { name: "Sword" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Bag" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Merchant" })).toBeNull();
    await fireEvent.change(screen.getByTestId("item-table-link-select"), {
      target: { value: "sword" },
    });
    expect(p.onLinkItem).toHaveBeenCalledWith("sword");
    expect(screen.queryByTestId("item-table-link-select")).toBeNull();
  });

  it("ignores the placeholder selection without closing the picker", async () => {
    const p = props();
    render(ItemTableToolbar, { props: p });
    await fireEvent.click(screen.getByTestId("item-table-link-item"));
    await fireEvent.change(screen.getByTestId("item-table-link-select"), {
      target: { value: "" },
    });
    expect(p.onLinkItem).not.toHaveBeenCalled();
    expect(screen.getByTestId("item-table-link-select")).toBeTruthy();
  });

  it("hides linking when disabled by the template", () => {
    const p = props();
    p.field.linkVaultItems = false;
    render(ItemTableToolbar, { props: p });
    expect(screen.queryByTestId("item-table-link-item")).toBeNull();
    expect(screen.getByTestId("item-table-add-row")).toBeTruthy();
  });

  it("hides editing controls on a read-only sheet", () => {
    const p = props();
    p.context.readOnly = true;
    render(ItemTableToolbar, { props: p });
    expect(screen.getByText("Equipment")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
