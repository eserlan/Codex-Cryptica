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

  it("uses a Cairn-sized room total and distributes Areas unevenly between sectors", () => {
    const rolls = [0.5, 0, 0, 0.9, 0.9, 0.5, 0.2];
    const generator = new DelveTopologyGenerator(() => rolls.shift() ?? 0);
    const doc = generator.generateFromConcept(sampleConcept);
    const roomNodes = doc.nodes.filter((node) => node.type === "delveRoom");
    const areasPerSector = sampleConcept.sectors.map(
      (sector) =>
        roomNodes.filter((node) => node.parentId === sector.id).length,
    );

    expect(roomNodes).toHaveLength(12);
    expect(areasPerSector).toEqual([5, 3, 4]);
    expect(new Set(areasPerSector).size).toBeGreaterThan(1);
  });

  it.each([
    ["small", 6, 9],
    ["medium", 10, 14],
    ["sprawling", 15, 20],
  ] as const)(
    "keeps %s delves within the configured Cairn room range",
    (size, minimum, maximum) => {
      const minimumDoc = new DelveTopologyGenerator(
        () => 0,
      ).generateFromConcept({ ...sampleConcept, size });
      const maximumDoc = new DelveTopologyGenerator(
        () => 0.999999,
      ).generateFromConcept({ ...sampleConcept, size });
      const countRooms = (doc: typeof minimumDoc) =>
        doc.nodes.filter((node) => node.type === "delveRoom").length;

      expect(countRooms(minimumDoc)).toBe(minimum);
      expect(countRooms(maximumDoc)).toBe(maximum);
    },
  );

  it("falls back to the medium range for legacy human-readable size values", () => {
    const doc = new DelveTopologyGenerator(() => 0).generateFromConcept({
      ...sampleConcept,
      size: "Medium Complex (3-4 Sectors)" as never,
    });

    expect(doc.nodes.filter((node) => node.type === "delveRoom")).toHaveLength(
      10,
    );
    expect(doc.metadata.size).toBe("medium");
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

  it("guarantees one AI-shaped climax and a separate reward in the final sector", () => {
    const doc = new DelveTopologyGenerator(() => 0).generateFromConcept(
      sampleConcept,
    );
    const roomNodes = doc.nodes.filter((node) => node.type === "delveRoom");
    const finalSectorId =
      sampleConcept.sectors[sampleConcept.sectors.length - 1].id;
    const climaxRooms = roomNodes.filter(
      (node) => (node.data as any).role === "climax",
    );
    const finalSectorRooms = roomNodes.filter(
      (node) => node.parentId === finalSectorId,
    );
    const climax = climaxRooms[0]?.data as any;

    expect(climaxRooms).toHaveLength(1);
    expect(climaxRooms[0].parentId).toBe(finalSectorId);
    expect(
      finalSectorRooms.some((node) => (node.data as any).role === "treasure"),
    ).toBe(true);
    expect(climax.stocking).toMatchObject({
      encounters: [],
      hazards: [],
      treasure: [],
      secrets: [],
    });
  });

  it("creates connected topology with real branches and alternate routes", () => {
    const generator = new DelveTopologyGenerator(() => 0);
    const doc = generator.generateFromConcept(sampleConcept);

    const roomNodes = doc.nodes.filter((n) => n.type === "delveRoom");
    const roomIds = new Set(roomNodes.map((n) => n.id));

    // Every edge connects two valid room nodes
    doc.edges.forEach((edge) => {
      expect(roomIds.has(edge.source)).toBe(true);
      expect(roomIds.has(edge.target)).toBe(true);
      expect(edge.data?.type).toBeDefined();
    });

    // Check for passage diversity (standard, hidden, conditional, vertical)
    const edgeTypes = new Set(doc.edges.map((e) => e.data?.type));
    expect(edgeTypes.size).toBeGreaterThanOrEqual(2);

    // The full delve remains reachable from its entrance.
    const neighbors = new Map<string, Set<string>>();
    for (const id of roomIds) neighbors.set(id, new Set());
    for (const edge of doc.edges) {
      neighbors.get(edge.source)?.add(edge.target);
      neighbors.get(edge.target)?.add(edge.source);
    }
    const visited = new Set<string>();
    const pending = [doc.metadata.entranceRoomIds[0]];
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const neighbor of neighbors.get(id) ?? []) {
        if (!visited.has(neighbor)) pending.push(neighbor);
      }
    }
    expect(visited.size).toBe(roomNodes.length);

    // A connected graph with at least as many edges as rooms contains a cycle,
    // and a degree above two proves it is not merely one long corridor.
    expect(doc.edges.length).toBeGreaterThanOrEqual(roomNodes.length);
    expect(
      Math.max(...Array.from(neighbors.values(), (set) => set.size)),
    ).toBeGreaterThan(2);
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

  it("does not add a generic theme label to sectors without one", () => {
    const doc = new DelveTopologyGenerator(() => 0).generateFromConcept({
      conceptId: "theme-free",
      title: "Theme-free Delve",
      size: "small",
      sectors: [{ id: "sec-1", name: "Upper Passages" }],
    });
    const sector = doc.nodes.find((node) => node.type === "delveSectorGroup");

    expect(sector?.data.theme).toBe("");
  });

  it("uses the injected clock for deterministic timestamps", () => {
    const mockTime = 1718000000000;
    const mockClock = { now: () => mockTime };
    const generator = new DelveTopologyGenerator(() => 0, mockClock);
    const doc = generator.generateFromConcept(sampleConcept);

    expect(doc.metadata.createdAt).toBe(mockTime);
    expect(doc.metadata.updatedAt).toBe(mockTime);
  });
});
