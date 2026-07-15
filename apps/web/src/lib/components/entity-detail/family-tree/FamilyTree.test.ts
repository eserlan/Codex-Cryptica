/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
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

describe("FamilyTree.svelte", () => {
  it("renders parents, focus, children and siblings across generations", () => {
    const tree: FamilyTreeData = {
      focusId: "focus",
      focus: member("focus", "focus", 0),
      parents: [member("mom", "parent", -1)],
      partners: [member("spouse", "partner", 0)],
      children: [member("kid", "child", 1)],
      siblings: [member("sib", "sibling", 0)],
    };
    render(FamilyTree, { tree });

    expect(screen.getByTestId("family-generation-parents")).toBeTruthy();
    expect(screen.getByTestId("family-generation-children")).toBeTruthy();
    // Focus row contains sibling + focus + partner.
    const focusRow = screen.getByTestId("family-generation-focus");
    expect(focusRow.textContent).toContain("SIB");
    expect(focusRow.textContent).toContain("FOCUS");
    expect(focusRow.textContent).toContain("SPOUSE");
    // mom + focus + spouse + kid + sib
    expect(screen.getAllByTestId("family-member-card").length).toBe(5);
  });

  it("draws spouse and sibling connectors, and a bar for multiple children", () => {
    const tree: FamilyTreeData = {
      focusId: "focus",
      focus: member("focus", "focus", 0),
      parents: [],
      partners: [member("spouse", "partner", 0)],
      children: [member("kid1", "child", 1), member("kid2", "child", 1)],
      siblings: [member("sib", "sibling", 0)],
    };
    render(FamilyTree, { tree });
    expect(screen.getByTestId("spouse-link")).toBeTruthy();
    expect(screen.getByTestId("sibling-link")).toBeTruthy();
    // A joining bar appears only when there is more than one child.
    expect(screen.getByTestId("children-bar")).toBeTruthy();
  });

  it("omits the children bar for a single child", () => {
    const tree: FamilyTreeData = {
      focusId: "focus",
      focus: member("focus", "focus", 0),
      parents: [],
      partners: [],
      children: [member("kid", "child", 1)],
      siblings: [],
    };
    render(FamilyTree, { tree });
    expect(screen.queryByTestId("children-bar")).toBeNull();
    expect(screen.queryByTestId("spouse-link")).toBeNull();
  });

  it("renders multiple partners on the focus row (edge case)", () => {
    const tree: FamilyTreeData = {
      focusId: "focus",
      focus: member("focus", "focus", 0),
      parents: [],
      partners: [member("p1", "partner", 0), member("p2", "partner", 0)],
      children: [],
      siblings: [],
    };
    render(FamilyTree, { tree });
    const focusRow = screen.getByTestId("family-generation-focus");
    expect(focusRow.textContent).toContain("P1");
    expect(focusRow.textContent).toContain("P2");
  });

  it("omits the parents generation when unknown (missing-generation gap)", () => {
    const tree: FamilyTreeData = {
      focusId: "focus",
      focus: member("focus", "focus", 0),
      parents: [],
      partners: [],
      children: [member("kid", "child", 1)],
      siblings: [],
    };
    render(FamilyTree, { tree });
    expect(screen.queryByTestId("family-generation-parents")).toBeNull();
    expect(screen.getByTestId("family-generation-children")).toBeTruthy();
  });
});
