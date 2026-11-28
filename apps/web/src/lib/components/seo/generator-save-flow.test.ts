import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import {
  businessGeneratorOutput as businessGeneratorOutputFor,
  generateBusinessLocal,
} from "generator-engine";
import type { SessionEntity } from "generator-engine";
import {
  saveGeneratorOutput,
  saveSessionHubEntities,
} from "./generator-save-flow";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { slugDrafts } from "./generator-page-drafts";
import { preloadLocalGenerator } from "./generator-page-local-generation.js";

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
    trackFailure: vi.fn(),
  };
}

const hubEntity: SessionEntity = {
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

const pointCrawlFailureOutput: GeneratorOutput = {
  type: "note",
  title: "Fen",
  summary: "s",
  content: "c",
  lore: "l",
  labels: [],
  status: "draft",
  pointCrawl: {
    title: "Fen",
    premise: "p",
    genre: "Classic Fantasy",
    scale: "Region",
    pointCount: 1,
    density: "Balanced branching",
    dangerLevel: "Moderate / Hazardous",
    secretFrequency: "Standard (1-2 secret routes)",
    startNodeId: "n1",
    goalNodeIds: ["n1"],
    warnings: [],
    nodes: [
      {
        id: "n1",
        name: "Node 1",
        role: "start",
        layer: 0,
        rail: 0,
        summary: "s",
        sensoryDescription: "d",
        whyVisit: "w",
        encounterOrHazard: "e",
        clueOrReward: "c",
        unlocksRouteIds: [],
      },
    ],
    routes: [],
  },
} as GeneratorOutput;

function businessOutput(): GeneratorOutput {
  return {
    ...businessGeneratorOutputFor(
      generateBusinessLocal({
        genre: "Classic Fantasy",
        businessType: "Blacksmith",
        scale: "established",
      }),
    ),
  } as GeneratorOutput;
}

type Deps = ReturnType<typeof dependencies>;

const paths: Array<{
  name: string;
  expected: { generatorType: string; isHubBatch: boolean };
  run: (deps: Deps) => unknown;
}> = [
  {
    name: "single result",
    expected: { generatorType: "npc", isHubBatch: false },
    run: (deps) =>
      saveGeneratorOutput(output, { content: "", lore: "" }, "npc", deps),
  },
  {
    name: "business",
    expected: { generatorType: "business", isHubBatch: true },
    run: (deps) =>
      saveGeneratorOutput(
        businessOutput(),
        { kind: "adventure" } as never,
        "business",
        deps,
      ),
  },
  {
    name: "point crawl",
    expected: { generatorType: "point-crawl", isHubBatch: true },
    run: (deps) =>
      saveGeneratorOutput(
        pointCrawlFailureOutput,
        { content: "", lore: "" },
        "point-crawl",
        deps,
      ),
  },
  {
    name: "session hub",
    expected: { generatorType: "hub", isHubBatch: true },
    run: (deps) =>
      saveSessionHubEntities([hubEntity], {}, [hubEntity], "hub", deps),
  },
];

describe.each(paths)("handoff failure signal: $name", (path) => {
  const settle = async (deps: Deps) => {
    try {
      await path.run(deps);
      return undefined;
    } catch (error) {
      return error;
    }
  };

  it("tracks once, skips track and rethrows the same error when store throws", async () => {
    const deps = dependencies();
    const storageError = new Error("storage blocked");
    deps.store.mockImplementation(() => {
      throw storageError;
    });

    expect(await settle(deps)).toBe(storageError);
    expect(deps.trackFailure).toHaveBeenCalledOnce();
    expect(deps.trackFailure).toHaveBeenCalledWith({
      ...path.expected,
      itemCount: expect.any(Number),
    });
    expect(deps.track).not.toHaveBeenCalled();
  });

  it("does not call trackFailure when store succeeds", async () => {
    const deps = dependencies();
    expect(await settle(deps)).toBeUndefined();
    expect(deps.track).toHaveBeenCalledOnce();
    expect(deps.trackFailure).not.toHaveBeenCalled();
  });

  it("rethrows the storage error when trackFailure throws", async () => {
    const deps = dependencies();
    const storageError = new Error("storage blocked");
    deps.store.mockImplementation(() => {
      throw storageError;
    });
    deps.trackFailure.mockImplementation(() => {
      throw new Error("analytics broke");
    });

    expect(await settle(deps)).toBe(storageError);
    expect(deps.track).not.toHaveBeenCalled();
  });
});

describe("offline generator save adapter readiness", () => {
  it.each(["business", "point-crawl"] as const)(
    "saves a %s result offline after route setup preloads its adapter",
    async (slug) => {
      await preloadLocalGenerator(slug);
      const originalFetch = globalThis.fetch;
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("offline"))),
      );
      try {
        const deps = dependencies();
        const result = await saveGeneratorOutput(
          slug === "business" ? businessOutput() : pointCrawlFailureOutput,
          { content: "", lore: "" },
          slug,
          deps,
        );
        expect(result).toContain(`generator-${slug}`);
        expect(deps.store).toHaveBeenCalledOnce();
      } finally {
        vi.stubGlobal("fetch", originalFetch);
      }
    },
  );
});

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

  it("uses the trusted Quest slug to keep mismatched-label lore private in the staged import", async () => {
    const deps = dependencies();
    const quest: GeneratorOutput = {
      ...output,
      type: "event",
      title: "The Millrace Ultimatum",
      content: "### The Hook\nThe village needs water.",
      lore: "### The Twist\nThe deed is forged.",
      labels: ["rpg-quest", "npc-generator", "imported-draft"],
    };

    await saveGeneratorOutput(
      quest,
      getGeneratorDocumentLayout(quest),
      "quest",
      deps,
    );

    const payload = JSON.parse(deps.store.mock.calls[0][1]) as {
      content: string;
      lore: string;
    };
    expect(payload.content).not.toContain("The deed is forged.");
    expect(payload.lore).toContain("The deed is forged.");
  });

  it("stages a BBEG as one Character with the entire original GM plan and recovers from a storage failure", async () => {
    const draft = slugDrafts["bbeg-generator"]!;
    const deps = dependencies();
    deps.store.mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    const layout = getGeneratorDocumentLayout(draft);
    expect(layout.content).toContain("The Villain's Plan");
    await expect(
      saveGeneratorOutput(draft, layout, "bbeg-generator", deps),
    ).rejects.toThrow("storage blocked");
    expect(deps.track).not.toHaveBeenCalled();
    expect(deps.trackFailure).toHaveBeenCalledWith({
      generatorType: "bbeg-generator",
      isHubBatch: false,
      itemCount: 1,
    });
    await saveGeneratorOutput(draft, layout, "bbeg-generator", deps);
    expect(deps.store).toHaveBeenCalledTimes(2);
    expect(deps.track).toHaveBeenCalledOnce();
    const payload = JSON.parse(deps.store.mock.calls[1][1]);
    expect(payload).toMatchObject({
      type: "character",
      title: draft.title,
      content: draft.content,
      lore: draft.lore,
      labels: draft.labels,
    });
    expect(payload.content).not.toContain("The Villain's Plan");
  });

  it("retries an RPG NPC save without exposing the Table Card secret", async () => {
    const draft = slugDrafts.npc!;
    const deps = dependencies();
    deps.store.mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    const layout = getGeneratorDocumentLayout(draft);
    await expect(
      saveGeneratorOutput(draft, layout, "npc", deps),
    ).rejects.toThrow("storage blocked");
    expect(deps.track).not.toHaveBeenCalled();
    await saveGeneratorOutput(draft, layout, "npc", deps);
    const payload = JSON.parse(deps.store.mock.calls[1][1]);
    expect(payload).toMatchObject({
      type: "character",
      title: draft.title,
      labels: draft.labels,
    });
    expect(payload.content).not.toContain("second manifest in her boot");
    expect(payload.lore).toContain("second manifest in her boot");
    expect(deps.track).toHaveBeenCalledOnce();
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

  it("hands a business to the import as the organisation and its ticked people", async () => {
    const deps = dependencies();
    const doc = generateBusinessLocal({
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "established",
    });
    const output = { ...businessGeneratorOutputFor(doc) } as GeneratorOutput;
    const query = await saveGeneratorOutput(
      output,
      { kind: "adventure" } as never,
      "business",
      deps,
    );
    const stored = JSON.parse(
      (deps.store as ReturnType<typeof vi.fn>).mock.calls[0][1],
    ) as Array<{ type: string; title: string }>;
    expect(stored[0].type).toBe("faction");
    expect(
      stored.some(
        (d) => d.type === "character" && d.title === doc.leadership.name,
      ),
    ).toBe(true);
    expect(query).toContain("utm_source=");
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
