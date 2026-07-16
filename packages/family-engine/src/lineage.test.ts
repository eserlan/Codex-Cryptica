import { describe, it, expect } from "vitest";
import { buildLineage } from "./lineage";
import { buildFamilyTree } from "./family-tree";
import {
  char,
  map,
  fiveGenerationLine,
  cadetBranchDynasty,
  cousinMarriageDoubleReach,
  ancestryCycle,
  oneSidedAncestorLink,
  largeDynasty,
} from "./lineage-fixtures";

function membersByGeneration(
  lineage: ReturnType<typeof buildLineage>,
  generation: number,
) {
  return (lineage.generations.get(generation) ?? []).slice().sort();
}

describe("buildLineage — core traversal (T005)", () => {
  it("includes every recorded ancestor and descendant generation", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities);
    expect(membersByGeneration(lineage, -3)).toContain("ggparent");
    expect(membersByGeneration(lineage, -2)).toContain("gparent");
    expect(membersByGeneration(lineage, -1)).toContain("parent");
    expect(lineage.members.get("parent")?.generation).toBe(-1);
    expect(lineage.members.get("gparent")?.generation).toBe(-2);
    expect(lineage.members.get("ggparent")?.generation).toBe(-3);
    expect(lineage.members.get("child")?.generation).toBe(1);
  });

  it("places partners at their member's generation and never traverses through them", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities);
    expect(lineage.members.get("fpartner")?.generation).toBe(0);
    expect(lineage.members.get("fpartner")?.kind).toBe("partner");
    // The partner's own ancestors/descendants (none recorded here) are not
    // pulled in — verified indirectly: no unexpected members beyond the chain.
    expect(lineage.members.size).toBe(10); // 5 chain + 5 partners
  });

  it("falls back to a single-member lineage for an unknown focus", () => {
    const lineage = buildLineage("ghost", map(char("someone")));
    expect(lineage.members.size).toBe(1);
    expect(lineage.members.get("ghost")?.kind).toBe("focus");
  });

  it("matches buildFamilyTree's immediate family for the same focus (bounded-view consistency)", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities);
    const tree = buildFamilyTree("focus", entities);

    const lineageParents = [...lineage.members.values()]
      .filter((m) => m.generation === -1 && m.kind === "ancestor")
      .map((m) => m.entityId)
      .sort();
    const lineageChildren = [...lineage.members.values()]
      .filter((m) => m.generation === 1 && m.kind === "descendant")
      .map((m) => m.entityId)
      .sort();
    const lineagePartners = [...lineage.members.values()]
      .filter((m) => m.kind === "partner" && m.generation === 0)
      .map((m) => m.entityId)
      .sort();

    expect(lineageParents).toEqual(tree.parents.map((m) => m.entityId).sort());
    expect(lineageChildren).toEqual(
      tree.children.map((m) => m.entityId).sort(),
    );
    expect(lineagePartners).toEqual(
      tree.partners.map((m) => m.entityId).sort(),
    );
  });

  it("terminates on a deliberate ancestry cycle, visiting each member once", () => {
    const entities = ancestryCycle();
    const lineage = buildLineage("focus", entities);
    // grandparent is reachable both as an ancestor (via parent) and as a
    // "child" of `child` (the cycle) — it must appear exactly once.
    const grandparentEntries = [...lineage.members.keys()].filter(
      (id) => id === "grandparent",
    );
    expect(grandparentEntries.length).toBe(1);
    const secondaryEdges = lineage.edges.filter((e) => e.secondary);
    expect(secondaryEdges.length).toBeGreaterThan(0);
  });

  it("reads one-sided ancestor links bidirectionally", () => {
    const lineage = buildLineage("focus", oneSidedAncestorLink());
    expect(lineage.members.get("parent")?.generation).toBe(-1);
  });

  it("does not duplicate a person reachable via two paths (cousin marriage / pedigree collapse)", () => {
    const lineage = buildLineage("focus", cousinMarriageDoubleReach());
    // grandparent is reached once, via parentA's chain.
    const grandparentCount = [...lineage.members.keys()].filter(
      (id) => id === "grandparent",
    ).length;
    expect(grandparentCount).toBe(1);
    // auntUncle is reachable both as parentA's sibling (shared grandparent)
    // and as parentB's own parent — the second reach becomes a secondary edge.
    const auntUncleCount = [...lineage.members.keys()].filter(
      (id) => id === "auntUncle",
    ).length;
    expect(auntUncleCount).toBe(1);
    const secondary = lineage.edges.filter(
      (e) => e.secondary && (e.to === "auntUncle" || e.from === "auntUncle"),
    );
    expect(secondary.length).toBeGreaterThan(0);
  });
});

describe("buildLineage — sibling branches (T006)", () => {
  it("includes other children of a direct-line member's parents as collapsed sibling-branch roots", () => {
    const entities = cadetBranchDynasty();
    const lineage = buildLineage("focus", entities);
    const auntUncle = lineage.members.get("auntUncle");
    expect(auntUncle).toBeDefined();
    expect(auntUncle?.kind).toBe("sibling-branch");
    expect(auntUncle?.generation).toBe(-1); // same generation as "parent"
    expect(lineage.siblingBranches.has("auntUncle")).toBe(true);
  });

  it("does not traverse a collapsed branch's descendants", () => {
    const entities = cadetBranchDynasty();
    const lineage = buildLineage("focus", entities);
    expect(lineage.members.has("cousin")).toBe(false);
  });

  it("reports a correct hiddenCount for a collapsed branch (size-only, still computed)", () => {
    const entities = cadetBranchDynasty();
    const lineage = buildLineage("focus", entities);
    const branch = lineage.siblingBranches.get("auntUncle");
    expect(branch?.hiddenCount).toBe(1); // "cousin"
    expect(branch?.memberIds).toEqual([]); // collapsed: no members materialised
  });

  it("traverses a branch's descendants only when the root is in expandedBranches", () => {
    const entities = cadetBranchDynasty();
    const lineage = buildLineage("focus", entities, {
      expandedBranches: new Set(["auntUncle"]),
    });
    expect(lineage.members.has("cousin")).toBe(true);
    expect(lineage.members.get("cousin")?.branchRootId).toBe("auntUncle");
    const branch = lineage.siblingBranches.get("auntUncle");
    expect(branch?.memberIds).toContain("cousin");
  });

  it("expands every branch when expandedBranches is 'all'", () => {
    const entities = cadetBranchDynasty();
    const lineage = buildLineage("focus", entities, {
      expandedBranches: "all",
    });
    expect(lineage.members.has("cousin")).toBe(true);
  });

  it("includes explicit sibling_of roots at the focus's generation even without a shared parent", () => {
    const entities = map(
      char("focus", [{ target: "bro", type: "sibling_of" }]),
      char("bro", [{ target: "focus", type: "sibling_of", label: "Brother" }]),
    );
    const lineage = buildLineage("focus", entities);
    const bro = lineage.members.get("bro");
    expect(bro?.kind).toBe("sibling-branch");
    expect(bro?.generation).toBe(0);
    expect(bro?.relationLabel).toBe("Brother");
  });

  it("still computes hiddenCount for a collapsed branch reachable via a cycle", () => {
    // grandparent's "other child" branch, where that branch eventually cycles
    // back into the main lineage — counting must still terminate.
    const entities = ancestryCycle();
    const lineage = buildLineage("focus", entities);
    // No separate branch root exists in this fixture, but this asserts the
    // overall build (which internally calls countHidden for any branches) is
    // no-hang; regression guard for cycle-safety of the counting walk.
    expect(lineage).toBeDefined();
  });
});

describe("buildLineage — depth caps (T013)", () => {
  it("stops traversal at maxUp/maxDown and reports truncation", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities, { maxUp: 1, maxDown: 1 });
    expect(lineage.members.has("parent")).toBe(true);
    expect(lineage.members.has("gparent")).toBe(false);
    expect(lineage.members.has("child")).toBe(true);
    expect(lineage.truncatedUp).toEqual({
      atGeneration: -2,
      hiddenGenerations: 2,
    });
    // Only one more generation exists below the focus.
    expect(lineage.truncatedDown).toBeNull();
  });

  it("reports null truncation when nothing exists beyond the cap", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities, { maxUp: 10, maxDown: 10 });
    expect(lineage.truncatedUp).toBeNull();
    expect(lineage.truncatedDown).toBeNull();
  });

  it("traverses everything when caps are omitted", () => {
    const entities = fiveGenerationLine();
    const lineage = buildLineage("focus", entities);
    expect(lineage.members.has("ggparent")).toBe(true);
    expect(lineage.truncatedUp).toBeNull();
  });

  it("caps a large dynasty and reports the correct hidden-generation count", () => {
    // largeDynasty(7) produces descendant generations 1..6 below focus (the
    // 7th recursion level adds a partner but no further children).
    const entities = largeDynasty(7);
    const lineage = buildLineage("focus", entities, { maxDown: 3 });
    expect(lineage.members.has("focusaaa")).toBe(true); // depth 3
    expect(lineage.members.has("focusaaaa")).toBe(false); // depth 4, capped
    expect(lineage.truncatedDown?.atGeneration).toBe(4);
    expect(lineage.truncatedDown?.hiddenGenerations).toBe(3); // depths 4..6
  });
});
