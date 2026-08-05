/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";
import ItemTableNode from "./ItemTableNode.svelte";

function makeContext(
  fields: PresentationRenderContext["fields"],
  readOnly = false,
): PresentationRenderContext {
  return {
    fields,
    readOnly,
    mode: "view",
    onUpdateFieldValue: vi.fn(),
    onAdjustCounter: vi.fn(),
  };
}

describe("ItemTableNode", () => {
  const itemTableField: StatSheetField = {
    id: "weapons_table",
    label: "Weapons & Equipment",
    type: "item-table",
    columns: [
      { id: "name", label: "Weapon", type: "text" },
      { id: "size", label: "Size/Force", type: "text" },
      { id: "reach", label: "Reach", type: "text" },
      { id: "damage", label: "Damage", type: "dice" },
      { id: "ap", label: "AP", type: "number" },
      { id: "hp", label: "HP", type: "counter" },
    ],
    rows: [
      {
        name: "War Hammer",
        size: "M",
        reach: "S",
        damage: "1d6+2+1d2",
        ap: 6,
        hp: { value: 8, max: 8 },
      },
    ],
  };

  it("renders header columns and initial rows", () => {
    const context = makeContext([itemTableField]);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    expect(screen.getByText("Weapon")).toBeTruthy();
    expect(screen.getByText("Damage")).toBeTruthy();
    const nameInput = screen.getByDisplayValue("War Hammer");
    expect(nameInput).toBeTruthy();
    expect(screen.getByText("1d6+2+1d2")).toBeTruthy();
  });

  it("calls onUpdateFieldValue when adding a row", async () => {
    const context = makeContext([itemTableField]);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    const addBtn = screen.getByTestId("item-table-add-row");
    await fireEvent.click(addBtn);

    expect(context.onUpdateFieldValue).toHaveBeenCalledWith(
      "weapons_table",
      expect.arrayContaining([
        expect.objectContaining({ name: "War Hammer" }),
        expect.objectContaining({ name: "" }),
      ]),
    );
  });
});
