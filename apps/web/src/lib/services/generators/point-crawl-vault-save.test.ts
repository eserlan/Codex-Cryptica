import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePointCrawlToVault } from "./point-crawl-vault-save";
import type { PointCrawlNetwork } from "generator-engine";

const samplePointCrawl: PointCrawlNetwork = {
  title: "Whispering Fen",
  premise: "A sunken marshland hiding drowned barrows.",
  genre: "Classic Fantasy",
  scale: "Region",
  pointCount: 3,
  density: "Balanced branching",
  dangerLevel: "Moderate / Hazardous",
  secretFrequency: "Standard (1-2 secret routes)",
  startNodeId: "node-1",
  goalNodeIds: ["node-2"],
  warnings: [],
  nodes: [
    {
      id: "node-1",
      name: "Stilt Village",
      role: "start",
      layer: 0,
      rail: 0,
      summary: "Rotting wood and peat smoke.",
      sensoryDescription: "Rotting wood and pungent peat smoke.",
      whyVisit: "Supplies and safety",
      encounterOrHazard: "Fisherman with advice",
      clueOrReward: "A map marking the dry crossing",
      unlocksRouteIds: [],
    },
    {
      id: "node-2",
      name: "Sunken Barrow",
      role: "goal",
      layer: 1,
      rail: 0,
      summary: "Cold dark water lapping against lichen-crusted megaliths.",
      sensoryDescription: "Cold dark water lapping against megaliths.",
      whyVisit: "Ancient treasure",
      encounterOrHazard: "Drowned Wight",
      clueOrReward: "A chest submerged in black mud",
      unlocksRouteIds: [],
    },
    {
      id: "node-3",
      name: "Rotwood Copse",
      role: "hazard",
      layer: 1,
      rail: 1,
      summary: "Gnarled cypress branches.",
      sensoryDescription: "Gnarled cypress branches dripping with moss.",
      whyVisit: "Shortcut",
      encounterOrHazard: "Giant Spiders",
      clueOrReward: "Spider silk bundles",
      unlocksRouteIds: [],
    },
  ],
  routes: [
    {
      id: "route-1",
      fromNodeId: "node-1",
      toNodeId: "node-2",
      direction: "bidirectional",
      visibility: "obvious",
      travelTime: "3 hours",
      terrain: "Plankway",
      risk: "Slippery rotted planks",
      signpost: "Carved guide poles",
    },
    {
      id: "route-2",
      fromNodeId: "node-1",
      toNodeId: "node-3",
      direction: "bidirectional",
      visibility: "obvious",
      travelTime: "1 hour",
      terrain: "Muddy Track",
      risk: "Thick mud",
      signpost: "Woven reed effigies",
    },
  ],
};

describe("savePointCrawlToVault", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates location entities, connects them with route summaries, and creates a master note", async () => {
    const createdEntities: any[] = [];
    const addedConnections: any[] = [];

    const mockVault = {
      createEntity: vi.fn(async (type: string, title: string, data: any) => {
        const id = `entity-${createdEntities.length + 1}`;
        const record = { id, type, title, ...data };
        createdEntities.push(record);
        return { id };
      }),
      addConnection: vi.fn(
        async (
          fromId: string,
          toId: string,
          relationship: string,
          label?: string,
        ) => {
          addedConnections.push({ fromId, toId, relationship, label });
        },
      ),
    };

    const result = await savePointCrawlToVault(
      samplePointCrawl,
      mockVault as any,
      {
        selectedNodeIds: ["node-1", "node-2"],
      },
    );

    expect(Object.keys(result.locationEntityIds)).toHaveLength(2);
    expect(result.overviewNoteId).toBeDefined();

    // Verify 2 Location entities created
    const locationEntities = createdEntities.filter(
      (e) => e.type === "location",
    );
    expect(locationEntities).toHaveLength(2);
    expect(locationEntities[0].title).toBe("Stilt Village");
    expect(locationEntities[1].title).toBe("Sunken Barrow");

    // Verify Location lore contains Routes & Exits
    expect(locationEntities[0].lore).toContain("## Routes & Exits");
    expect(locationEntities[0].lore).toContain("Sunken Barrow");
    expect(locationEntities[0].lore).toContain("3 hours");

    // Verify connection between node-1 and node-2 was added with route summary
    expect(mockVault.addConnection).toHaveBeenCalledWith(
      "entity-1",
      "entity-2",
      "route",
      "3 hours · Plankway",
    );

    // Verify Master Note created
    const masterNote = createdEntities.find((e) => e.type === "note");
    expect(masterNote).toBeDefined();
    expect(masterNote.title).toBe("Whispering Fen");
    expect(masterNote.kind).toBe("point-crawl");
    expect(masterNote.content).toContain(
      "A sunken marshland hiding drowned barrows.",
    );
    expect(masterNote.lore).toContain("Locks, Gates & Where Keys Are Found");
    expect(masterNote.lore).toContain("Secret & Rumoured Shortcuts");
    expect(masterNote.lore).not.toContain("Rotwood Copse"); // node-3 was not selected
  });

  it("saves all nodes when selectedNodeIds is omitted", async () => {
    const createdEntities: any[] = [];
    const mockVault = {
      createEntity: vi.fn(async (type: string, title: string, data: any) => {
        const id = `id-${createdEntities.length + 1}`;
        const record = { id, type, title, ...data };
        createdEntities.push(record);
        return { id };
      }),
      addConnection: vi.fn(async () => {}),
    };

    const result = await savePointCrawlToVault(
      samplePointCrawl,
      mockVault as any,
    );
    expect(Object.keys(result.locationEntityIds)).toHaveLength(3);
    expect(createdEntities).toHaveLength(4); // 3 Locations + 1 Master Note
  });
});
