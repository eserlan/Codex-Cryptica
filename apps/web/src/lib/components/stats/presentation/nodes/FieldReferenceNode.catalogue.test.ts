/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { FieldReferenceNode as FieldReferenceNodeType } from "@codex/stat-sheet-engine";
import type { StatSheetField } from "schema";
import type { PresentationRenderContext } from "../types";

vi.mock("#lib/utils/stat-sheet-field-actions.js", () => ({
  rollStatSheetDiceField: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { entities: {}, allEntities: [] },
}));

import FieldReferenceNode from "./FieldReferenceNode.svelte";

const stock: StatSheetField = {
  id: "stock",
  label: "Stock",
  type: "item-table",
  stockLedger: true,
  columns: [{ id: "name", label: "Item", type: "text" }],
  rows: [
    {
      rowId: "rope",
      name: "Rope",
      stock: { kind: "item", quantity: 2, note: "GM only" },
    },
    {
      rowId: "ring",
      name: "Ring",
      stock: { kind: "item", quantity: 1, availability: "hidden" },
    },
  ],
};

function renderStock(displayMode: "table" | "catalogue") {
  const node: FieldReferenceNodeType = {
    type: "field-reference",
    fieldId: "stock",
    displayMode,
  };
  const context = {
    fields: [stock],
    // The sheet itself is editable; only the catalogue mode narrows it.
    readOnly: false,
    mode: "view",
    sectionKeys: new Map(),
    isSectionCollapsed: () => false,
    onToggleSection: vi.fn(),
    onUpdateFieldValue: vi.fn(),
    onUpdateField: vi.fn(),
    onAdjustCounter: vi.fn(),
  } as PresentationRenderContext;
  render(FieldReferenceNode, { props: { node, context } });
  return context;
}

describe("FieldReferenceNode item-table display modes (#3962)", () => {
  it("renders the editable stock manager for display=table", () => {
    renderStock("table");
    expect(screen.getByTestId("item-table-add-row")).toBeTruthy();
    // Editable cells hold the name in an input; hidden lines stay visible to the GM.
    expect(screen.getByDisplayValue("Ring")).toBeTruthy();
  });

  it("renders a read-only catalogue for display=catalogue on an editable sheet", () => {
    const context = renderStock("catalogue");
    expect(screen.queryByTestId("item-table-add-row")).toBeNull();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.getByText("Rope")).toBeTruthy();
    expect(screen.queryByText("Ring")).toBeNull();
    expect(screen.queryByText("GM only")).toBeNull();
    expect(context.onUpdateField).not.toHaveBeenCalled();
  });
});
