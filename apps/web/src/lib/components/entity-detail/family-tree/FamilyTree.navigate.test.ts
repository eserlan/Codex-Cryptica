/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import type { FamilyTree as FamilyTreeData } from "@codex/family-engine";
import FamilyTree from "./FamilyTree.svelte";

function member(
  id: string,
  relation: FamilyTreeData["focus"]["relation"],
  generation: number,
) {
  return {
    entityId: id,
    name: id.toUpperCase(),
    deceased: false,
    relation,
    generation,
  };
}

function tree(): FamilyTreeData {
  return {
    focusId: "focus",
    focus: member("focus", "focus", 0),
    parents: [member("mom", "parent", -1)],
    partners: [],
    children: [member("kid", "child", 1)],
    siblings: [],
  };
}

describe("FamilyTree navigation", () => {
  it("calls onSelect when a non-focus card is selected (re-centre)", async () => {
    const onSelect = vi.fn();
    render(FamilyTree, { tree: tree(), onSelect });
    // The parent card is selectable; the focus card is not.
    const selectButtons = screen.getAllByTestId("family-card-select");
    await fireEvent.click(selectButtons[0]);
    expect(onSelect).toHaveBeenCalledWith("mom");
  });

  it("calls onOpen when a card's open control is clicked", async () => {
    const onOpen = vi.fn();
    render(FamilyTree, { tree: tree(), onOpen });
    const openButtons = screen.getAllByTestId("family-card-open");
    await fireEvent.click(openButtons[0]);
    expect(onOpen).toHaveBeenCalled();
  });

  it("collapses and expands the children branch", async () => {
    render(FamilyTree, { tree: tree() });
    expect(screen.getByTestId("family-generation-children")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("toggle-children"));
    expect(screen.queryByTestId("family-generation-children")).toBeNull();

    await fireEvent.click(screen.getByTestId("toggle-children"));
    expect(screen.getByTestId("family-generation-children")).toBeTruthy();
  });
});
