import { describe, it, expect } from "vitest";
import { DungeonDelveService } from "./dungeon-delve-service";

describe("DungeonDelveService", () => {
  const sampleEntity = {
    id: "entity-dungeon-777",
    title: "The Howling Caverns",
    content: "A deep subterranean cave system infested with wind-demons.",
    metadata: {
      size: "sprawling",
      sectors: [
        { id: "s1", name: "Windswept Chasm", theme: "Gales & Crags", order: 1 },
        {
          id: "s2",
          name: "The Echoing Abyss",
          theme: "Bottomless Pit",
          order: 2,
        },
      ],
      factions: ["Gorgon Cult", "Wind Elementals"],
      hazards: ["Freezing Gusts", "Razor Rocks"],
    },
  };

  it("builds a positioned DelveCanvasDocument from a Dungeon concept entity", () => {
    const service = new DungeonDelveService();
    const canvasDoc = service.buildDelveCanvasFromConcept(sampleEntity);

    expect(canvasDoc).toBeDefined();
    expect(canvasDoc.conceptId).toBe("entity-dungeon-777");
    expect(canvasDoc.title).toBe("The Howling Caverns");
    expect(canvasDoc.nodes.length).toBeGreaterThan(0);
    expect(canvasDoc.edges.length).toBeGreaterThan(0);

    // Verify layout positioning was applied
    const roomNodes = canvasDoc.nodes.filter((n) => n.type === "delveRoom");
    expect(roomNodes.length).toBeGreaterThan(0);
    roomNodes.forEach((node) => {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    });
  });

  it("handles entities missing explicit sector arrays by falling back gracefully", () => {
    const service = new DungeonDelveService();
    const minimalEntity = {
      id: "entity-min-1",
      name: "Forgotten Den",
    };

    const canvasDoc = service.buildDelveCanvasFromConcept(minimalEntity);
    expect(canvasDoc).toBeDefined();
    expect(canvasDoc.title).toBe("Forgotten Den");
    expect(canvasDoc.nodes.length).toBeGreaterThan(0);
  });
});
