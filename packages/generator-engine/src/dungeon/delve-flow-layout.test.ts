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

  it("places the sector entrance above its sibling branches", () => {
    const layoutEngine = new DelveFlowLayout();
    const positionedDoc = layoutEngine.applyLayout({
      id: "branch-layout",
      conceptId: "branch-layout",
      title: "Branch Layout",
      metadata: {
        size: "small",
        entranceRoomIds: ["room-1"],
        createdAt: 1,
        updatedAt: 1,
      },
      nodes: [
        {
          id: "sector-1",
          type: "delveSectorGroup",
          position: { x: 0, y: 0 },
          data: {
            id: "sector-1",
            name: "Upper Halls",
            theme: "Stone",
            description: "",
            order: 1,
          },
        },
        ...[
          ["room-1", "entrance"],
          ["room-2", "hazard"],
          ["room-3", "secret"],
        ].map(([id, role]) => ({
          id,
          type: "delveRoom",
          parentId: "sector-1",
          position: { x: 0, y: 0 },
          data: {
            id,
            sectorId: "sector-1",
            sectorName: "Upper Halls",
            name: id,
            role,
            summary: "",
            description: "",
            stocking: {},
          },
        })),
      ] as any,
      edges: [
        {
          id: "edge-1-2",
          source: "room-1",
          target: "room-2",
          data: {
            id: "edge-1-2",
            sourceRoomId: "room-1",
            targetRoomId: "room-2",
            type: "standard",
            bidirectional: true,
          },
        },
        {
          id: "edge-1-3",
          source: "room-1",
          target: "room-3",
          data: {
            id: "edge-1-3",
            sourceRoomId: "room-1",
            targetRoomId: "room-3",
            type: "conditional",
            bidirectional: true,
          },
        },
        {
          id: "edge-2-3",
          source: "room-2",
          target: "room-3",
          data: {
            id: "edge-2-3",
            sourceRoomId: "room-2",
            targetRoomId: "room-3",
            type: "hidden",
            bidirectional: true,
          },
        },
      ],
    });
    const entrance = positionedDoc.nodes.find((node) => node.id === "room-1")!;
    const leftBranch = positionedDoc.nodes.find(
      (node) => node.id === "room-2",
    )!;
    const rightBranch = positionedDoc.nodes.find(
      (node) => node.id === "room-3",
    )!;

    expect(leftBranch.position.y).toBe(rightBranch.position.y);
    expect(leftBranch.position.y).toBeGreaterThan(entrance.position.y);
    expect(leftBranch.position.x).toBeLessThan(entrance.position.x);
    expect(rightBranch.position.x).toBeGreaterThan(entrance.position.x);
  });
});
