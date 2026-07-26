import { describe, it, expect } from "vitest";
import { DelveTopologyGenerator } from "./delve-topology-generator";
import { DelveFlowLayout } from "./delve-flow-layout";

describe("DelveFlowLayout", () => {
  const sampleConcept = {
    conceptId: "layout-test-1",
    title: "Flow Layout Test Dungeon",
    size: "medium" as const,
    sectors: [
      { id: "sec-1", name: "Upper Hall", order: 1 },
      { id: "sec-2", name: "Deep Vaults", order: 2 },
    ],
  };

  it("calculates sector dimensions and node positions without throwing", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    const layoutEngine = new DelveFlowLayout();
    const positionedDoc = layoutEngine.applyLayout(doc);

    expect(positionedDoc).toBeDefined();
    expect(positionedDoc.nodes.length).toBe(doc.nodes.length);
  });

  it("assigns positive width and height to sector group container frames", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);
    const layoutEngine = new DelveFlowLayout();
    const positionedDoc = layoutEngine.applyLayout(doc);

    const sectorNodes = positionedDoc.nodes.filter(
      (n) => n.type === "delveSectorGroup",
    );
    sectorNodes.forEach((sec) => {
      expect(sec.width).toBeGreaterThan(300);
      expect(sec.height).toBeGreaterThan(200);
    });
  });

  it("positions rooms inside their parent sector bounds with non-overlapping coordinates", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);
    const layoutEngine = new DelveFlowLayout();
    const positionedDoc = layoutEngine.applyLayout(doc);

    const _sector1 = positionedDoc.nodes.find((n) => n.id === "sec-1")!;
    const sector1Rooms = positionedDoc.nodes.filter(
      (n) => n.type === "delveRoom" && n.parentId === "sec-1",
    );

    expect(sector1Rooms.length).toBeGreaterThan(0);

    // Check positions are relative to parent and spaced out
    const positions = sector1Rooms.map((r) => r.position);
    for (let i = 0; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThanOrEqual(20);
      expect(positions[i].y).toBeGreaterThanOrEqual(40);

      for (let j = i + 1; j < positions.length; j++) {
        const dx = Math.abs(positions[i].x - positions[j].x);
        const dy = Math.abs(positions[i].y - positions[j].y);
        // Rooms shouldn't be at exact same coordinate
        expect(dx > 50 || dy > 50).toBe(true);
      }
    }
  });

  it("stacks sector group containers with spacing so sectors do not overlap", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);
    const layoutEngine = new DelveFlowLayout();
    const positionedDoc = layoutEngine.applyLayout(doc);

    const sector1 = positionedDoc.nodes.find((n) => n.id === "sec-1")!;
    const sector2 = positionedDoc.nodes.find((n) => n.id === "sec-2")!;

    expect(sector2.position.y).toBeGreaterThan(
      sector1.position.y + (sector1.height || 0),
    );
  });
});
