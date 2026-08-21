/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

const { rollStatSheetDiceField, vaultState } = vi.hoisted(() => ({
  rollStatSheetDiceField: vi.fn(),
  vaultState: {
    entities: {
      "steel-sword": {
        id: "steel-sword",
        type: "item",
        title: "Steel Sword",
        statSheet: {
          fields: [
            { id: "size", label: "Size/Force", type: "text", value: "M" },
          ],
        },
      },
    },
  },
}));

vi.mock("$lib/utils/stat-sheet-field-actions", () => ({
  rollStatSheetDiceField,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    get entities() {
      return vaultState.entities;
    },
    get allEntities() {
      return Object.values(vaultState.entities);
    },
  },
}));

import ItemTableNode from "./ItemTableNode.svelte";

function makeContext(
  fields: PresentationRenderContext["fields"],
  readOnly = false,
): PresentationRenderContext {
  return {
    fields,
    readOnly,
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
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

  it("persists added rows on the item-table field", async () => {
    const context = makeContext([itemTableField]);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    const addBtn = screen.getByTestId("item-table-add-row");
    await fireEvent.click(addBtn);

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ name: "War Hammer" }),
          expect.objectContaining({ name: "" }),
        ]),
      }),
    );
  });

  it("links a vault item and renders its title and matching stats live", async () => {
    const field = { ...itemTableField, rows: [] };
    const context = makeContext([field]);
    const { unmount } = render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(screen.getByTestId("item-table-link-item"));
    await fireEvent.change(screen.getByTestId("item-table-link-select"), {
      target: { value: "steel-sword" },
    });

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({ rows: [{ entityId: "steel-sword" }] }),
    );

    unmount();
    render(ItemTableNode, {
      props: {
        field: { ...field, rows: [{ entityId: "steel-sword" }] },
        context,
      },
    });
    expect(screen.getByText("Steel Sword")).toBeTruthy();
    expect(screen.getByText("M")).toBeTruthy();
  });

  it("persists cell edits and labels editable cells", async () => {
    const context = makeContext([itemTableField]);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    const weaponInput = screen.getByRole("textbox", {
      name: "Weapon for item 1",
    });
    await fireEvent.input(weaponInput, { target: { value: "Spear" } });

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ name: "Spear" })],
      }),
    );
  });

  it("persists row removal", async () => {
    const context = makeContext([itemTableField]);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Remove War Hammer" }),
    );

    expect(context.onUpdateField).toHaveBeenCalledWith("weapons_table", {
      rows: [],
    });
  });

  it("clamps counters to zero", async () => {
    const field = {
      ...itemTableField,
      rows: [{ ...itemTableField.rows![0], hp: { value: 0, max: 8 } }],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Decrease HP for War Hammer" }),
    );

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ hp: { value: 0, max: 8 } })],
      }),
    );
  });

  it("does not increase counters beyond their configured maximum", async () => {
    const field = {
      ...itemTableField,
      rows: [{ ...itemTableField.rows![0], hp: { value: 8, max: 8 } }],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Increase HP for War Hammer" }),
    );

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ hp: { value: 8, max: 8 } })],
      }),
    );
  });

  it("seeds new rows with the column's configured dice formula and counter max", async () => {
    const field: StatSheetField = {
      id: "weapons_table",
      label: "Weapons",
      type: "item-table",
      linkVaultItems: false,
      columns: [
        { id: "damage", label: "Damage", type: "dice", formula: "2d8+3" },
        { id: "hp", label: "HP", type: "counter", max: 12 },
      ],
      rows: [],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(screen.getByTestId("item-table-add-row"));

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            damage: "2d8+3",
            hp: { value: 12, max: 12 },
          }),
        ],
      }),
    );
  });

  it("seeds new counter rows at least at the column's configured minimum", async () => {
    const field: StatSheetField = {
      id: "weapons_table",
      label: "Weapons",
      type: "item-table",
      linkVaultItems: false,
      columns: [{ id: "hp", label: "HP", type: "counter", min: 10 }],
      rows: [],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(screen.getByTestId("item-table-add-row"));

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ hp: { value: 10, max: 6 } })],
      }),
    );
  });

  it("adjusts counters by the column's configured step and respects its configured minimum", async () => {
    const field: StatSheetField = {
      id: "weapons_table",
      label: "Weapons",
      type: "item-table",
      linkVaultItems: false,
      columns: [{ id: "hp", label: "HP", type: "counter", min: 5, step: 3 }],
      rows: [{ name: "Ogre", hp: { value: 8, max: 12 } }],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Decrease HP for Ogre" }),
    );

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "weapons_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ hp: { value: 5, max: 12 } })],
      }),
    );
  });

  it("hides row controls in read-only mode", () => {
    const context = makeContext([itemTableField], true);
    render(ItemTableNode, { props: { field: itemTableField, context } });

    expect(screen.queryByTestId("item-table-add-row")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Remove War Hammer" }),
    ).toBeNull();
  });

  it("renders dice roll errors without a success colour", async () => {
    rollStatSheetDiceField.mockResolvedValueOnce({
      text: "Invalid formula",
      isError: true,
      success: false,
    });
    const context = makeContext([itemTableField]);
    const { container } = render(ItemTableNode, {
      props: { field: itemTableField, context },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Roll 1d6+2+1d2 for War Hammer" }),
    );

    expect(screen.getByText("(Invalid formula)")).toBeTruthy();
    expect(container.querySelector(".text-green-400")).toBeNull();
  });

  it("hides the vault item link controls when linkVaultItems is disabled", () => {
    const field: StatSheetField = {
      id: "skills_table",
      label: "Skills",
      type: "item-table",
      linkVaultItems: false,
      columns: [{ id: "skill", label: "Skill", type: "text" }],
      rows: [],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    expect(screen.queryByTestId("item-table-link-item")).toBeNull();
  });

  it("shows the vault item link controls by default for tables without linkVaultItems set", () => {
    const field: StatSheetField = {
      id: "skills_table",
      label: "Skills",
      type: "item-table",
      columns: [{ id: "skill", label: "Skill", type: "text" }],
      rows: [],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    expect(screen.getByTestId("item-table-link-item")).toBeTruthy();
  });

  it("renders and persists a checkbox column", async () => {
    const field: StatSheetField = {
      id: "skills_table",
      label: "Skills",
      type: "item-table",
      linkVaultItems: false,
      columns: [
        { id: "skill", label: "Skill", type: "text" },
        { id: "trained", label: "Trained", type: "checkbox" },
      ],
      rows: [{ skill: "Athletics", trained: false }],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    const checkbox = screen.getByRole("checkbox", {
      name: "Trained for item 1",
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    await fireEvent.click(checkbox);

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "skills_table",
      expect.objectContaining({
        rows: [expect.objectContaining({ trained: true })],
      }),
    );
  });

  it("defaults checkbox columns to false on new rows", async () => {
    const field: StatSheetField = {
      id: "skills_table",
      label: "Skills",
      type: "item-table",
      linkVaultItems: false,
      columns: [{ id: "trained", label: "Trained", type: "checkbox" }],
      rows: [],
    };
    const context = makeContext([field]);
    render(ItemTableNode, { props: { field, context } });

    await fireEvent.click(screen.getByTestId("item-table-add-row"));

    expect(context.onUpdateField).toHaveBeenCalledWith(
      "skills_table",
      expect.objectContaining({
        rows: [{ trained: false }],
      }),
    );
  });

  it("renders successful dice rolls with a success colour", async () => {
    rollStatSheetDiceField.mockResolvedValueOnce({
      text: "7",
      isError: false,
      success: true,
    });
    const context = makeContext([itemTableField]);
    const { container } = render(ItemTableNode, {
      props: { field: itemTableField, context },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Roll 1d6+2+1d2 for War Hammer" }),
    );

    expect(screen.getByText("(7)")).toBeTruthy();
    expect(container.querySelector(".text-green-400")).toBeTruthy();
  });

  it("applies compact column classes and aligns text columns appropriately", () => {
    const context = makeContext([itemTableField]);
    const { container } = render(ItemTableNode, {
      props: { field: itemTableField, context },
    });

    const headers = container.querySelectorAll("th");
    // Header for "Weapon" (name column) should be left-aligned with min-width
    expect(headers[0].className).toContain("text-left");
    expect(headers[0].className).toContain("min-w-[7rem]");

    // Header for "Size/Force" (short text column) should be compact centered
    expect(headers[1].className).toContain("text-center");
    expect(headers[1].className).toContain("min-w-[4rem]");

    // Header for "AP" (number column) should have compact width
    expect(headers[4].className).toContain("w-16");

    // Header for "HP" (counter column) should have compact width
    expect(headers[5].className).toContain("w-24");
  });
});
