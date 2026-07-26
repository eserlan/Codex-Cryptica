import { describe, it, expect } from "vitest";
import { DelveTopologyGenerator } from "./delve-topology-generator";

describe("DelveTopologyGenerator", () => {
  const sampleConcept = {
    conceptId: "dungeon-test-101",
    title: "The Sunken Vaults",
    size: "medium" as const,
    sectors: [
      {
        id: "sec-1",
        name: "Flooded Entrance",
        theme: "Submerged Steps",
        order: 1,
      },
      {
        id: "sec-2",
        name: "Drowned Crypts",
        theme: "Stone Sarcophagi",
        order: 2,
      },
      {
        id: "sec-3",
        name: "The Abyssal Shrine",
        theme: "Sunken Reliquary",
        order: 3,
      },
    ],
    factions: ["Drowned Cultists", "Grave Rats"],
    hazards: ["Rising Water", "Poisonous Miasma"],
  };

  it("generates a valid DelveCanvasDocument structure from concept input", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    expect(doc.id).toBeDefined();
    expect(doc.conceptId).toBe("dungeon-test-101");
    expect(doc.title).toBe("The Sunken Vaults");
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.edges.length).toBeGreaterThan(0);
  });

  it("creates sector frame group nodes and room nodes", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    const sectorNodes = doc.nodes.filter((n) => n.type === "delveSectorGroup");
    const roomNodes = doc.nodes.filter((n) => n.type === "delveRoom");

    expect(sectorNodes.length).toBe(3);
    expect(roomNodes.length).toBeGreaterThanOrEqual(9);
  });

  it("guarantees at least one entrance room and correct metadata entrance IDs", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    const entranceRooms = doc.nodes.filter(
      (n) => n.type === "delveRoom" && (n.data as any).role === "entrance",
    );

    expect(entranceRooms.length).toBeGreaterThanOrEqual(1);
    expect(doc.metadata.entranceRoomIds.length).toBeGreaterThanOrEqual(1);
    expect(doc.metadata.entranceRoomIds).toContain(entranceRooms[0].id);
  });

  it("creates non-linear topology with passages connecting room nodes", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept(sampleConcept);

    const roomIds = new Set(
      doc.nodes.filter((n) => n.type === "delveRoom").map((n) => n.id),
    );

    // Every edge connects two valid room nodes
    doc.edges.forEach((edge) => {
      expect(roomIds.has(edge.source)).toBe(true);
      expect(roomIds.has(edge.target)).toBe(true);
      expect(edge.data?.type).toBeDefined();
    });

    // Check for passage diversity (standard, hidden, conditional, vertical)
    const edgeTypes = new Set(doc.edges.map((e) => e.data?.type));
    expect(edgeTypes.size).toBeGreaterThanOrEqual(2);
  });

  it("handles concepts with missing sectors by providing a default sector", () => {
    const generator = new DelveTopologyGenerator();
    const doc = generator.generateFromConcept({
      conceptId: "dungeon-minimal",
      title: "Minimalist Cave",
      size: "small",
      sectors: [],
    });

    const sectorNodes = doc.nodes.filter((n) => n.type === "delveSectorGroup");
    expect(sectorNodes.length).toBeGreaterThanOrEqual(1);
    expect(
      doc.nodes.filter((n) => n.type === "delveRoom").length,
    ).toBeGreaterThanOrEqual(5);
  });
});
