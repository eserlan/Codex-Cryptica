import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionEntity } from "generator-engine";
import {
  saveGeneratorOutput,
  saveSessionHubEntities,
} from "./generator-save-flow";

const output: GeneratorOutput = {
  type: "location",
  title: "The Hollow Crown",
  summary: "A fallen order.",
  content: "Raw content",
  lore: "Raw lore",
  labels: [],
  status: "draft",
};

function dependencies() {
  return {
    store: vi.fn(),
    track: vi.fn(),
    countRelatedEntities: vi.fn().mockReturnValue(2),
  };
}

describe("generator save flows", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("persists and tracks an output with its optional diagram", async () => {
    const deps = dependencies();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const exportMap = vi.fn().mockResolvedValue("data:image/png;base64,abc");

    const query = await saveGeneratorOutput(
      output,
      { content: "Rendered content", lore: "Rendered lore" },
      "locations",
      deps,
      exportMap,
    );

    expect(query).toContain("utm_source=generator-location");
    expect(JSON.parse(deps.store.mock.calls[0][1])).toMatchObject({
      title: output.title,
      mapImageDataUrl: "data:image/png;base64,abc",
    });
    expect(deps.track).toHaveBeenCalledWith({
      generatorType: "locations",
      isHubBatch: false,
      itemCount: 1,
      relatedEntityCount: 2,
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("continues saving when diagram export fails, but rejects storage failures", async () => {
    const deps = dependencies();
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      saveGeneratorOutput(
        output,
        { content: "Rendered", lore: "" },
        "locations",
        deps,
        async () => {
          throw new Error("diagram failed");
        },
      ),
    ).resolves.toContain("utm_medium=save-to-vault");
    expect(JSON.parse(deps.store.mock.calls[0][1])).not.toHaveProperty(
      "mapImageDataUrl",
    );

    deps.store.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    await expect(
      saveGeneratorOutput(output, { content: "", lore: "" }, "locations", deps),
    ).rejects.toThrow("storage blocked");
    expect(deps.track).toHaveBeenCalledOnce();
  });

  it("saves hub drafts and their provenance based related-entity counts", () => {
    const deps = dependencies();
    const entity: SessionEntity = {
      id: "one",
      type: "note",
      title: "One",
      content: "Draft",
      lore: "",
      labels: [],
      status: "draft",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    };

    const query = saveSessionHubEntities(
      [entity],
      {},
      [entity],
      "locations",
      deps,
    );

    expect(query).toContain("utm_medium=save-all");
    expect(JSON.parse(deps.store.mock.calls[0][1])).toHaveLength(1);
    expect(deps.track).toHaveBeenCalledWith({
      generatorType: "locations",
      isHubBatch: true,
      itemCount: 1,
      relatedEntityCount: 2,
    });
  });

  it("handles point-crawl batch save with location entities and master note", async () => {
    const deps = dependencies();
    const pointCrawlOutput: GeneratorOutput = {
      type: "note",
      title: "Whispering Fen",
      summary: "A sunken marshland hiding drowned barrows.",
      content: "Overview content",
      lore: "Overview lore",
      labels: ["point-crawl"],
      status: "draft",
      pointCrawl: {
        title: "Whispering Fen",
        premise: "A sunken marshland hiding drowned barrows.",
        genre: "Classic Fantasy",
        scale: "Region",
        pointCount: 2,
        density: "Balanced branching",
        dangerLevel: "Moderate / Hazardous",
        secretFrequency: "Standard (1-2 secret routes)",
        startNodeId: "n1",
        goalNodeIds: ["n2"],
        warnings: [],
        nodes: [
          {
            id: "n1",
            name: "Node 1",
            role: "start",
            layer: 0,
            rail: 0,
            summary: "Starting outpost",
            sensoryDescription: "Rotting wood and peat smoke.",
            whyVisit: "Safe haven",
            encounterOrHazard: "Fisherman guide",
            clueOrReward: "Fen map",
            unlocksRouteIds: [],
          },
          {
            id: "n2",
            name: "Node 2",
            role: "goal",
            layer: 1,
            rail: 0,
            summary: "Sunken barrow",
            sensoryDescription: "Drowned tombs under black water.",
            whyVisit: "Ancient treasure",
            encounterOrHazard: "Drowned dead",
            clueOrReward: "Sunken crown",
            unlocksRouteIds: [],
          },
        ],
        routes: [
          {
            id: "r1",
            fromNodeId: "n1",
            toNodeId: "n2",
            direction: "bidirectional",
            visibility: "obvious",
            travelTime: "2 hours",
            terrain: "Plankway",
            risk: "Slippery rotted planks",
            signpost: "Carved wooden posts",
          },
        ],
      },
    };

    const query = await saveGeneratorOutput(
      pointCrawlOutput,
      { content: "Rendered overview", lore: "Rendered lore" },
      "point-crawl",
      deps,
    );

    expect(query).toContain("utm_source=generator-point-crawl");
    // Verify stored payload in __codex_pending_import
    const stored = JSON.parse(deps.store.mock.calls[0][1]);
    expect(stored).toBeInstanceOf(Array);
    expect(stored).toHaveLength(3); // 2 Locations + 1 Master Note
    expect(stored[0].type).toBe("location");
    expect(stored[1].type).toBe("location");
    expect(stored[2].type).toBe("note");
    expect(stored[2].kind).toBe("point-crawl");
    expect(deps.track).toHaveBeenCalledWith({
      generatorType: "point-crawl",
      isHubBatch: true,
      itemCount: 3,
      relatedEntityCount: 6,
    });
  });
});
