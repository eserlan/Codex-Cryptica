import { describe, it, expect } from "vitest";
import {
  DungeonDelveService,
  isDelveLocationEntity,
} from "./dungeon-delve-service";

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
    expect(canvasDoc.metadata).toMatchObject({
      sourceEntityId: "entity-dungeon-777",
      autoPopulateAreas: true,
      areaPopulationStatus: "pending",
    });

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

  it("extracts generated sector headings stored in entity lore", () => {
    const service = new DungeonDelveService();
    const canvasDoc = service.buildDelveCanvasFromConcept({
      id: "entity-lore-dungeon",
      title: "The Hollowed Citadel of Bruneth",
      content: "A one-line generated summary.",
      lore: [
        "## Key Sectors & Layout",
        "### Sector 1: The Hollow Gate",
        "An ossuary entrance.",
        "### Sector 2: The Sunken Court",
        "A flooded throne room.",
      ].join("\n"),
    });

    expect(
      canvasDoc.nodes.some(
        (node) =>
          "sectorName" in node.data &&
          node.data.sectorName === "The Hollow Gate",
      ),
    ).toBe(true);
  });

  it("extracts numbered rooms from the generated Dungeon Layout section", () => {
    const service = new DungeonDelveService();
    const canvasDoc = service.buildDelveCanvasFromConcept({
      id: "entity-numbered-layout",
      title: "The Hollowed Citadel of Bruneth",
      content: "A one-line generated summary.",
      lore: [
        "### Dungeon Layout",
        "",
        "1. The Sunken Forge",
        "2. The Subterranean Reservoir",
        "3. The Deep Arcana Vault",
        "",
        "### Central Secret / Boss Mystery",
        "The fountain grants true sight.",
      ].join("\n"),
    });

    const sectorNames = canvasDoc.nodes.flatMap((node) =>
      "sectorName" in node.data ? [node.data.sectorName] : [],
    );
    expect(sectorNames).toContain("The Sunken Forge");
    expect(sectorNames).toContain("The Subterranean Reservoir");
    expect(sectorNames).toContain("The Deep Arcana Vault");
  });
});

describe("isDelveLocationEntity", () => {
  it("recognizes delves saved with dungeon generator provenance", () => {
    expect(
      isDelveLocationEntity({
        type: "location",
        kind: "dungeon",
        labels: ["dungeon", "location"],
      }),
    ).toBe(true);
  });

  it("recognizes legacy generated delves by their generator label signature", () => {
    expect(
      isDelveLocationEntity({
        type: "location",
        title: "The Hollowed Citadel of Bruneth",
        labels: ["dungeon", "location", "fantasy", "temple-shrine"],
        content: "A one-line generated summary.",
        lore: [
          "### Dungeon Layout",
          "",
          "1. The Sunken Forge",
          "2. The Subterranean Reservoir",
          "3. The Deep Arcana Vault",
          "",
          "### Central Secret / Boss Mystery",
          "The fountain grants true sight.",
        ].join("\n"),
      }),
    ).toBe(true);
  });

  it("does not treat a manually added dungeon label as generator provenance", () => {
    expect(
      isDelveLocationEntity({
        type: "location",
        labels: ["dungeon"],
        content: "A manually written location.",
      }),
    ).toBe(false);
  });
});
