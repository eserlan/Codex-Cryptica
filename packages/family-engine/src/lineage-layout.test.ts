import { describe, it, expect } from "vitest";
import { buildLineage } from "./lineage";
import { layoutLineage } from "./lineage-layout";
import {
  fiveGenerationLine,
  cadetBranchDynasty,
  largeDynasty,
} from "./lineage-fixtures";

function rectsOverlap(
  a: { x: number; y: number },
  b: { x: number; y: number },
  w: number,
  h: number,
): boolean {
  return a.x < b.x + w && b.x < a.x + w && a.y < b.y + h && b.y < a.y + h;
}

describe("layoutLineage (T007)", () => {
  it("puts each generation on its own row, ordered oldest at top", () => {
    const lineage = buildLineage("focus", fiveGenerationLine());
    const positioned = layoutLineage(lineage);
    const yOf = (id: string) => positioned.cards.find((c) => c.id === id)!.y;
    expect(yOf("ggparent")).toBeLessThan(yOf("gparent"));
    expect(yOf("gparent")).toBeLessThan(yOf("parent"));
    expect(yOf("parent")).toBeLessThan(yOf("focus"));
    expect(yOf("focus")).toBeLessThan(yOf("child"));
    // Same generation -> same y.
    expect(yOf("focus")).toBe(yOf("fpartner"));
  });

  it("produces no overlapping card rectangles", () => {
    const lineage = buildLineage("focus", cadetBranchDynasty(), {
      expandedBranches: "all",
    });
    const positioned = layoutLineage(lineage, {
      cardWidth: 112,
      cardHeight: 96,
    });
    for (let i = 0; i < positioned.cards.length; i++) {
      for (let j = i + 1; j < positioned.cards.length; j++) {
        expect(
          rectsOverlap(positioned.cards[i], positioned.cards[j], 112, 96),
        ).toBe(false);
      }
    }
  });

  it("keeps partners horizontally adjacent to their member", () => {
    const lineage = buildLineage("focus", fiveGenerationLine());
    const positioned = layoutLineage(lineage, { cardWidth: 112, hGap: 16 });
    const focus = positioned.cards.find((c) => c.id === "focus")!;
    const partner = positioned.cards.find((c) => c.id === "fpartner")!;
    expect(Math.abs(partner.x - (focus.x + 112 + 16))).toBeLessThan(1);
  });

  it("attaches a multi-partner ancestor's children to the correct partner couple", () => {
    const lineage = buildLineage("focus", cadetBranchDynasty(), {
      expandedBranches: "all",
    });
    const positioned = layoutLineage(lineage);
    const byId = new Map(positioned.cards.map((c) => [c.id, c]));
    const parentX = byId.get("parent")!.x;
    const partnerAX = byId.get("partnerA")!.x;
    const auntUncleX = byId.get("auntUncle")!.x;
    const partnerBX = byId.get("partnerB")!.x;
    const cousinX = byId.get("cousin")!.x;
    // cousin (auntUncle+partnerB's child) centres under that couple, not parent+partnerA's.
    const coupleAMid = (parentX + partnerAX) / 2;
    const coupleBMid = (auntUncleX + partnerBX) / 2;
    expect(Math.abs(cousinX - coupleBMid)).toBeLessThan(
      Math.abs(cousinX - coupleAMid),
    );
  });

  it("produces deterministic output for identical input", () => {
    const lineage = buildLineage("focus", fiveGenerationLine());
    const a = layoutLineage(lineage);
    const b = layoutLineage(lineage);
    expect(a).toEqual(b);
  });

  it("sources collapsed-indicator hiddenCount from the lineage's siblingBranches", () => {
    const lineage = buildLineage("focus", cadetBranchDynasty());
    const positioned = layoutLineage(lineage);
    const indicator = positioned.collapsedIndicators.find(
      (i) => i.branchRootId === "auntUncle",
    );
    expect(indicator?.hiddenCount).toBe(1);
  });

  it("produces bounds tightly containing all cards", () => {
    const lineage = buildLineage("focus", fiveGenerationLine());
    const positioned = layoutLineage(lineage, {
      cardWidth: 112,
      cardHeight: 96,
    });
    for (const card of positioned.cards) {
      expect(card.x + 112).toBeLessThanOrEqual(
        positioned.bounds.width + Math.min(0, card.x) + 1,
      );
    }
    expect(positioned.bounds.width).toBeGreaterThan(0);
    expect(positioned.bounds.height).toBeGreaterThan(0);
  });

  it("lays out and renders a ~200+ member dynasty without overlaps (SC-003 guard)", () => {
    const entities = largeDynasty(7);
    expect(Object.keys(entities).length).toBeGreaterThanOrEqual(200);
    const lineage = buildLineage("focus", entities, {
      expandedBranches: "all",
    });
    const start = performance.now();
    const positioned = layoutLineage(lineage);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(positioned.cards.length).toBeGreaterThanOrEqual(200);
  });
});
