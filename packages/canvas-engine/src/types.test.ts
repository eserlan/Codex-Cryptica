import { describe, expect, it } from "vitest";
import { CanvasSchema } from "./types";

describe("CanvasSchema", () => {
  it("round-trips persisted Delve nodes and edge data", () => {
    const persisted = {
      id: "delve-canvas-bruneth",
      name: "The Hollowed Citadel of Bruneth",
      nodes: [
        {
          id: "sector-1",
          type: "delveSectorGroup",
          position: { x: 0, y: 0 },
          width: 600,
          height: 400,
          data: {
            id: "sector-1",
            name: "The Sunken Forge",
            theme: "Dungeon Chamber",
            description: "",
            order: 1,
          },
        },
        {
          id: "room-1-1",
          type: "delveRoom",
          parentId: "sector-1",
          extent: "parent",
          position: { x: 40, y: 60 },
          width: 220,
          height: 120,
          data: {
            id: "room-1-1",
            sectorId: "sector-1",
            sectorName: "The Sunken Forge",
            name: "The Sunken Forge - Area 1",
            role: "entrance",
            summary: "The entrance",
            description: "A dark chamber.",
            stocking: { atmosphere: "Chilly stone air" },
          },
        },
      ],
      edges: [
        {
          id: "edge-room-1-1-room-1-2",
          source: "room-1-1",
          target: "room-1-2",
          type: "delveEdge",
          data: {
            sourceRoomId: "room-1-1",
            targetRoomId: "room-1-2",
            type: "standard",
            bidirectional: true,
          },
        },
      ],
      metadata: {
        sourceEntityId: "entity-bruneth",
        kind: "delve",
      },
    };

    const parsed = CanvasSchema.parse(JSON.parse(JSON.stringify(persisted)));

    expect(parsed).toEqual(persisted);
  });

  it("still rejects ordinary entity nodes without an entity id", () => {
    expect(() =>
      CanvasSchema.parse({
        nodes: [
          {
            id: "broken-node",
            type: "entity",
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      }),
    ).toThrow();
  });

  it("migrates legacy delve nodes whose payload lived at the node root", () => {
    const parsed = CanvasSchema.parse({
      id: "legacy-delve",
      nodes: [
        {
          id: "room-1",
          type: "delveRoom",
          position: { x: 10, y: 20 },
          sectorId: "sector-1",
          sectorName: "The Bell Vault",
          name: "Riven Threshold",
          role: "entrance",
          summary: "A cracked gate.",
          description: "Bronze doors hang from one hinge.",
          stocking: { atmosphere: "Cold metal and rain" },
        },
      ],
      edges: [],
    });

    expect(parsed.nodes[0]).toMatchObject({
      id: "room-1",
      type: "delveRoom",
      position: { x: 10, y: 20 },
      data: {
        id: "room-1",
        sectorId: "sector-1",
        sectorName: "The Bell Vault",
        name: "Riven Threshold",
        role: "entrance",
      },
    });
    expect(parsed.nodes[0]).not.toHaveProperty("sectorId");
  });
});
