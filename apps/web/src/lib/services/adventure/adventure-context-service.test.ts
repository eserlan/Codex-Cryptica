import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { AdventureContextService } from "./adventure-context-service";

const session = {
  vaultId: "vault-1",
  title: "The Drowned March",
  premise: "A king stirs beneath the flooded bridge.",
  playerCharacter: {
    kind: "provisional" as const,
    name: "Kirvan",
    description: "A young farmhand.",
  },
  sourceRecords: [{ recordId: "anchor-1" }],
} as any;

describe("AdventureContextService", () => {
  it("retrieves a bounded, setup-grounded opening context without duplicate anchors", async () => {
    const search = vi.fn().mockResolvedValue([
      { id: "anchor-1", title: "Anchor", type: "place", text: "Ignored" },
      {
        id: "bridge-1",
        title: "Flooded Bridge",
        type: "place",
        text: "x".repeat(4_100),
        lore: "The bridge conceals the drowned king's shrine.",
      },
    ]);
    const service = new AdventureContextService({ getById: vi.fn(), search });

    const result = await service.resolveOpeningRelevant(session);

    expect(search).toHaveBeenCalledWith(
      "vault-1",
      expect.stringContaining("The Drowned March"),
      8,
    );
    expect(search.mock.calls[0][1]).toContain("Kirvan");
    expect(result).toEqual([
      expect.objectContaining({
        recordId: "bridge-1",
        role: "turn-source",
        content: "x".repeat(4_000),
        lore: "The bridge conceals the drowned king's shrine.",
      }),
    ]);
  });

  it("returns no opening context when search finds no matching records", async () => {
    const service = new AdventureContextService({
      getById: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
    });

    await expect(service.resolveOpeningRelevant(session)).resolves.toEqual([]);
  });

  it("resolves explicit scenario anchors through the existing bounded grounding selection", async () => {
    const getById = vi.fn(async (_vaultId: string, id: string) => ({
      id,
      title: "Hidden archive",
      type: "location",
      visibility: "hidden" as const,
      text: "The archive's real passage is behind the altar.",
      lore: "Secret source detail",
    }));
    const current = {
      ...session,
      sourceRecords: [],
      visibleState: {
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      scenarioCollection: {
        version: 1,
        focusedScenarioId: null,
        items: [
          {
            id: "scenario-1",
            origin: { kind: "manual" as const, manualId: "manual-1" },
            playerVisible: { rumour: "A rumour", lead: "A lead" },
            gmOnly: { truth: "The truth", secretBindings: {} },
            status: "open" as const,
            knowledge: "unheard" as const,
            anchorRefs: ["archive-1"],
            events: [],
            secretBindings: { truth: "secret-1", eventIds: {} },
            revealedSecretIds: [],
          },
        ],
      },
    };
    const service = new AdventureContextService({
      getById,
      search: vi.fn().mockResolvedValue([]),
    });
    const result = await service.resolveOpeningRelevant(current);
    expect(result).toEqual([
      expect.objectContaining({
        recordId: "archive-1",
        content: expect.stringContaining(
          "existence and identity are not player knowledge",
        ),
        lore: expect.stringContaining("Secret source detail"),
      }),
    ]);
  });
  it("uses the live Vault graph/calendar adapter for a bounded temporal lookup", async () => {
    const make = (
      id: string,
      type: string,
      options: Record<string, unknown> = {},
    ) => ({
      id,
      type,
      title: id,
      content: id,
      connections: [],
      ...options,
    });
    const getWorldSnapshot = vi.fn().mockResolvedValue({
      calendar: DEFAULT_CALENDAR,
      entities: [
        make("pc", "character", {
          connections: [{ target: "city", type: "knows", strength: 1 }],
        }),
        make("city", "location", {
          connections: [{ target: "king", type: "contains", strength: 1 }],
        }),
        make("king", "character", {
          start_date: { year: 600 },
          end_date: { year: 620 },
          lore: "secret court plan",
        }),
        make("remote", "location", { date: { year: 600 } }),
      ],
    });
    const getById = vi.fn(async (_vaultId: string, id: string) => ({
      id,
      title: id,
      type: id === "city" ? "location" : "character",
      text: id + " body loaded from OPFS",
      lore: id === "king" ? "secret court plan" : undefined,
    }));
    const service = new AdventureContextService({
      getById,
      search: vi.fn(),
      getWorldSnapshot,
    });
    const result = await service.resolveTemporalWorld({
      vaultId: "vault-1",
      characterId: "pc",
      locationId: "city",
      at: { year: 618 },
      maxRecords: 3,
    });
    expect(getWorldSnapshot).toHaveBeenCalledWith("vault-1");
    expect(result.playerSafe.map((r) => r.id)).toContain("king");
    expect(JSON.stringify(result.playerSafe)).not.toContain(
      "secret court plan",
    );
    expect(result.gmOnly.find((r) => r.id === "king")?.lore).toBe(
      "secret court plan",
    );
    expect(result.gmOnly.map((r) => r.id)).not.toContain("remote");
    expect(getById).toHaveBeenCalledTimes(3);
    expect(getById).not.toHaveBeenCalledWith("vault-1", "remote");
    expect(result.gmOnly.find((r) => r.id === "king")?.content).toContain(
      "body loaded from OPFS",
    );
  });

  it("recomputes the projection with visibility and dates restored by hydration", async () => {
    const make = (
      id: string,
      type: string,
      extra: Record<string, unknown> = {},
    ) => ({
      id,
      type,
      title: id,
      content: id,
      connections: [],
      ...extra,
    });
    const getWorldSnapshot = vi.fn().mockResolvedValue({
      calendar: DEFAULT_CALENDAR,
      entities: [
        make("pc", "character", {
          connections: [{ target: "city", type: "knows", strength: 1 }],
        }),
        make("city", "location", {
          connections: [
            { target: "spy", type: "hides", strength: 1 },
            { target: "king", type: "rules", strength: 1 },
          ],
        }),
        // The index is stale: both look established and visible.
        make("spy", "character", { start_date: { year: 600 } }),
        make("king", "character", { start_date: { year: 600 } }),
      ],
    });
    const getById = vi.fn(async (_vaultId: string, id: string) => ({
      id,
      title: id,
      type: id === "city" ? "location" : "character",
      text: id + " body",
      ...(id === "spy" ? { visibility: "hidden" as const } : {}),
      ...(id === "king"
        ? { start_date: { year: 600 }, end_date: { year: 610 } }
        : {}),
    }));
    const service = new AdventureContextService({
      getById,
      search: vi.fn(),
      getWorldSnapshot,
    });
    const result = await service.resolveTemporalWorld({
      vaultId: "vault-1",
      characterId: "pc",
      locationId: "city",
      at: { year: 618 },
    });
    expect(result.playerSafe.map((r) => r.id)).not.toContain("spy");
    expect(result.gmOnly.find((r) => r.id === "king")?.applicability).toBe(
      "historical",
    );
  });

  describe("dated World Entry sessions", () => {
    const entities = [
      {
        id: "pc",
        type: "character",
        title: "Lira",
        content: "",
        connections: [],
        start_date: { year: 600 },
      },
      {
        id: "heir",
        type: "character",
        title: "Heir",
        content: "",
        connections: [],
        start_date: { year: 625 },
      },
      {
        id: "siege",
        type: "event",
        title: "Siege",
        content: "",
        connections: [],
        date: { year: 610 },
      },
    ];
    const bodies: Record<string, string> = {
      pc: "Lira is a smith. She dies in 640.",
      heir: "The heir is born in 625.",
      siege: "The siege of 610 broke the walls.",
    };
    const datedSession = {
      vaultId: "vault-1",
      title: "Northbrook",
      premise: "Start here",
      playerCharacter: { kind: "canonical", name: "Lira", recordId: "pc" },
      sourceRecords: [{ recordId: "pc", role: "player-character" }],
      worldEntry: {
        version: 1,
        location: { kind: "provisional", name: "Northbrook" },
        at: { year: 618 },
        intent: "explore",
      },
      visibleState: { location: { text: "Northbrook" } },
    } as any;

    function service() {
      const record = (id: string) => {
        const entity = entities.find((e) => e.id === id)!;
        return {
          id,
          title: entity.title,
          type: entity.type,
          text: bodies[id]!,
          start_date: (entity as any).start_date,
          date: (entity as any).date,
        };
      };
      return new AdventureContextService({
        getWorldSnapshot: vi.fn().mockResolvedValue({
          entities,
          calendar: DEFAULT_CALENDAR,
        }),
        getById: vi.fn(async (_v: string, id: string) => record(id)),
        search: vi.fn(async () => [record("heir"), record("siege")]),
      });
    }

    it("keeps undated anchor prose GM-only", async () => {
      const [anchor] = await service().resolveAnchors(datedSession);
      expect(anchor?.content).not.toContain("dies in 640");
      expect(anchor?.content).toContain("[Period applicability:");
      expect(anchor?.lore).toContain("dies in 640");
    });

    it("applies the date policy to action retrieval", async () => {
      const relevant = await service().resolveActionRelevant(
        datedSession,
        "Ask about the heir",
      );
      const heir = relevant.find((r) => r.recordId === "heir")!;
      expect(heir.content).toContain("[Period applicability: future]");
      expect(heir.content).not.toContain("born in 625");
      expect(heir.lore).toContain("Not yet true in this period");
      const siege = relevant.find((r) => r.recordId === "siege")!;
      expect(siege.content).toContain("The siege of 610 broke the walls.");
    });

    it("leaves undated sessions unchanged", async () => {
      const { worldEntry: _w, ...undated } = datedSession;
      const [anchor] = await service().resolveAnchors(undated);
      expect(anchor?.content).toBe("Lira is a smith. She dies in 640.");
    });
  });
});

describe("required Adventure sources and retrieval limits", () => {
  it("requires a canonical character even if a legacy session omitted its source reference", async () => {
    const getById = vi.fn(async () => null);
    const service = new AdventureContextService({
      getById,
      search: vi.fn(async () => []),
    });
    await expect(
      service.resolveAnchors({
        ...session,
        sourceRecords: [],
        playerCharacter: { kind: "canonical", name: "Mara", recordId: "pc" },
      }),
    ).rejects.toThrow("required-source-unavailable");
    expect(getById).toHaveBeenCalledWith("vault-1", "pc");
  });

  it("rejects an oversized required selection before loading any bodies", async () => {
    const getById = vi.fn();
    const service = new AdventureContextService({ getById, search: vi.fn() });
    await expect(
      service.resolveAnchors({
        ...session,
        sourceRecords: Array.from({ length: 25 }, (_, i) => ({
          recordId: `r-${i}`,
          role: "anchor",
        })),
      } as any),
    ).rejects.toThrow("grounding-anchor-budget-exceeded");
    expect(getById).not.toHaveBeenCalled();
  });

  it("rechecks required sources rather than silently treating a deleted anchor as empty", async () => {
    const service = new AdventureContextService({
      getById: vi.fn(async () => null),
      search: vi.fn(async () => []),
    });
    await expect(service.verifyRequiredSources(session)).rejects.toThrow(
      "required-source-unavailable",
    );
  });

  it("hydrates only bounded relevant records in a 10,000-record Vault", async () => {
    const entities = Array.from({ length: 10_000 }, (_, index) => ({
      id: `place-${index}`,
      type: "location",
      title: `Place ${index}`,
      content: "",
      connections:
        index === 0
          ? Array.from({ length: 60 }, (_, i) => ({
              target: `place-${i + 1}`,
              type: "near",
              strength: 1,
            }))
          : [],
    }));
    const reads: string[] = [];
    const service = new AdventureContextService({
      getWorldSnapshot: async () =>
        ({ entities, calendar: DEFAULT_CALENDAR }) as any,
      getById: async (_vault, id) => {
        reads.push(id);
        return {
          id,
          title: id,
          type: "location",
          text: "Established local record",
          date: { year: 610 },
        };
      },
      search: vi.fn(async () => []),
    });
    const current = {
      ...session,
      sourceRecords: [],
      worldEntry: {
        version: 1,
        location: { kind: "canonical", name: "Place 0", recordId: "place-0" },
        at: { year: 618 },
        intent: "explore",
      },
    } as any;
    const start = performance.now();
    const anchors = await service.resolveAnchors(current);
    const relevant = await service.resolveOpeningRelevant(current);
    expect(anchors).toHaveLength(1);
    expect(relevant.length).toBeGreaterThan(0);
    expect(relevant.length).toBeLessThanOrEqual(14);
    expect(new Set(reads).size).toBeLessThanOrEqual(24);
    expect(reads.length).toBeLessThanOrEqual(30);
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(10_000);
    process.stdout.write(
      "grounding-fixture " +
        JSON.stringify({
          vaultRecords: entities.length,
          bodyReads: reads.length,
          uniqueBodies: new Set(reads).size,
          sourceRecords: anchors.length + relevant.length,
          sourceChars: JSON.stringify([...anchors, ...relevant]).length,
          elapsedMs: Math.round(elapsedMs),
        }) +
        "\n",
    );
  });
});

it("preserves temporal classification when a hidden record matches an action", async () => {
  const hidden = {
    id: "future-secret",
    title: "Secret Succession",
    type: "event",
    text: "The prince succeeds in 625",
    visibility: "hidden" as const,
    date: { year: 625 },
  };
  const service = new AdventureContextService({
    getWorldSnapshot: async () =>
      ({
        calendar: DEFAULT_CALENDAR,
        entities: [{ ...hidden, content: hidden.text, connections: [] }],
      }) as any,
    getById: async () => hidden,
    search: async () => [hidden],
  });
  const sources = await service.resolveActionRelevant(
    {
      ...session,
      sourceRecords: [],
      visibleState: {},
      worldEntry: {
        version: 1,
        location: { kind: "provisional", name: "Town" },
        at: { year: 618 },
        intent: "explore",
      },
    } as any,
    "Ask about the prince",
  );
  expect(sources[0].content).toContain("GM-only source");
  expect(sources[0].content).toContain("future");
  expect(sources[0].content).not.toContain(hidden.text);
  expect(sources[0].lore).toContain("Period applicability: future");
});

it("follows a committed location change and includes bounded relationship provenance", async () => {
  const entities = [
    {
      id: "start",
      title: "Old Town",
      type: "location",
      content: "Old town.",
      connections: [],
    },
    {
      id: "current",
      title: "New Town",
      type: "location",
      content: "New town.",
      connections: [{ target: "keeper", type: "home", strength: 1 }],
    },
    {
      id: "keeper",
      title: "Keeper",
      type: "character",
      content: "A local keeper.",
      connections: [{ target: "current", type: "lives in", strength: 1 }],
    },
  ];
  const service = new AdventureContextService({
    getWorldSnapshot: async () =>
      ({ entities, calendar: DEFAULT_CALENDAR }) as any,
    getById: async (_vault, id) => {
      const entity = entities.find((record) => record.id === id)!;
      return { ...entity, text: entity.content };
    },
    search: async () => [],
  });
  const current = {
    ...session,
    sourceRecords: [],
    visibleState: {
      location: {
        source: "canonical",
        sourceRecordId: "current",
        text: "New Town",
      },
    },
    worldEntry: {
      version: 1,
      location: { kind: "canonical", recordId: "start", name: "Old Town" },
      intent: "explore",
    },
  } as any;
  const sources = await service.resolveActionRelevant(current, "Ask a local");
  const keeper = sources.find((source) => source.recordId === "keeper");
  expect(keeper?.lore).toContain("lives in");
  expect(keeper?.lore).toContain("undated relationship references");
  expect(keeper?.content).not.toContain("lives in");
});

it("fails safely when dated retrieval has no calendar/snapshot adapter", async () => {
  const service = new AdventureContextService({
    getById: vi.fn(),
    search: vi.fn(async () => []),
  });
  await expect(
    service.resolveAnchors({
      ...session,
      sourceRecords: [],
      worldEntry: { at: { year: 618 } },
    } as any),
  ).rejects.toThrow("temporal-world-not-configured");
});

it("does not hydrate newly ranked candidates beyond the initial temporal selection", async () => {
  const entities = [
    {
      id: "root",
      title: "Town",
      type: "location",
      content: "",
      connections: [{ target: "old", type: "near", strength: 1 }],
    },
    {
      id: "old",
      title: "Old neighbor",
      type: "location",
      content: "",
      connections: [],
    },
    {
      id: "new",
      title: "New neighbor",
      type: "location",
      content: "",
      connections: [],
    },
  ];
  const getById = vi.fn(async (_vault: string, id: string) => ({
    id,
    title: id,
    type: "location",
    text: "Loaded",
    connections:
      id === "root" ? [{ target: "new", type: "near", strength: 1 }] : [],
  }));
  const service = new AdventureContextService({
    getWorldSnapshot: async () =>
      ({ entities, calendar: DEFAULT_CALENDAR }) as any,
    getById,
    search: async () => [],
  });
  const result = await service.resolveTemporalWorld({
    vaultId: "vault-1",
    locationId: "root",
    at: { year: 618 },
    maxRecords: 2,
  });
  expect(getById).toHaveBeenCalledTimes(2);
  expect(getById).not.toHaveBeenCalledWith("vault-1", "new");
  expect(result.gmOnly.some((record) => record.id === "new")).toBe(false);
});

it("keeps relevant future and hidden opening sources in labelled GM context", async () => {
  const entities = [
    {
      id: "town",
      title: "Town",
      type: "location",
      content: "Town biography",
      connections: [
        { target: "future", type: "event", strength: 1 },
        { target: "secret", type: "actor", strength: 1 },
      ],
    },
    {
      id: "future",
      title: "Succession",
      type: "event",
      content: "The succession occurs in 625.",
      date: { year: 625 },
      connections: [],
    },
    {
      id: "secret",
      title: "Hidden agent",
      type: "character",
      content: "The agent plans a betrayal.",
      visibility: "hidden",
      connections: [],
    },
  ];
  const service = new AdventureContextService({
    getWorldSnapshot: async () =>
      ({ entities, calendar: DEFAULT_CALENDAR }) as any,
    getById: async (_vault, id) => {
      const entity = entities.find((record) => record.id === id)!;
      return { ...entity, text: entity.content } as any;
    },
    search: async () => [],
  });
  const current = {
    ...session,
    sourceRecords: [],
    visibleState: {},
    worldEntry: {
      version: 1,
      location: { kind: "canonical", recordId: "town", name: "Town" },
      at: { year: 618 },
      intent: "explore",
    },
  } as any;
  const sources = await service.resolveOpeningRelevant(current);
  const future = sources.find((source) => source.recordId === "future");
  expect(future?.content).toContain("future");
  expect(future?.content).not.toContain("occurs in 625");
  expect(future?.lore).toContain("Not yet true");
  const hidden = sources.find((source) => source.recordId === "secret");
  expect(hidden?.content).toContain("GM-only source");
  expect(hidden?.content).not.toContain("betrayal");
  expect(hidden?.lore).toContain("betrayal");
});

describe("dated Adventure grounding after time advances", () => {
  it("refreshes opening and action context after fictional days pass", async () => {
    const calendar = {
      ...DEFAULT_CALENDAR,
      useGregorian: false,
      months: [
        { id: "bloom", name: "Bloom", days: 2 },
        { id: "frost", name: "Frost", days: 3 },
      ],
    };
    const town = {
      id: "town",
      title: "Town",
      type: "location",
      content: "Town",
      connections: [{ target: "festival", type: "associated", strength: 1 }],
    };
    const festival = {
      id: "festival",
      title: "Festival",
      type: "event",
      content: "A festival begins at Bloom 1 of year 619.",
      date: { year: 619, month: 1, day: 1 },
      connections: [{ target: "town", type: "associated", strength: 1 }],
    };
    const sources = [town, festival];
    const service = new AdventureContextService({
      getWorldSnapshot: async () => ({ entities: sources, calendar }) as any,
      getById: async (_vaultId, id) => {
        const record = sources.find((item) => item.id === id);
        return record ? { ...record, text: record.content } : null;
      },
      search: async () => [{ ...festival, text: festival.content }],
    });
    const at = { year: 618, month: 2, day: 3 };
    const entry = {
      ...session,
      sourceRecords: [{ recordId: "town", role: "anchor" }],
      visibleState: {
        location: {
          source: "canonical",
          sourceRecordId: "town",
          text: "Town",
        },
      },
      worldEntry: {
        version: 1,
        location: { kind: "canonical", name: "Town", recordId: "town" },
        at,
        intent: "explore",
      },
    } as any;
    const initialOpening = await service.resolveOpeningRelevant(entry);
    const initialFestival = initialOpening.find(
      (record) => record.recordId === "festival",
    );
    expect(initialFestival?.content).toContain("Period applicability: future");
    expect(initialFestival?.content).not.toContain("begins at Bloom");

    const advanced = {
      ...entry,
      worldTime: { version: 1, elapsedMinutes: 2 * 1_440, events: [] },
    };
    const laterOpening = await service.resolveOpeningRelevant(advanced);
    const laterAction = await service.resolveActionRelevant(
      advanced,
      "Return for the festival",
    );
    for (const relevant of [laterOpening, laterAction]) {
      const record = relevant.find((source) => source.recordId === "festival");
      expect(record?.content).toContain("Period applicability: historical");
      expect(record?.content).toContain("begins at Bloom");
    }
    const directSnapshot = await service.resolveTemporalWorld({
      vaultId: "vault-1",
      locationId: "town",
      at,
      elapsedMinutes: 2 * 1_440,
    });
    expect(
      directSnapshot.playerSafe.some((record) => record.id === "festival"),
    ).toBe(true);
    expect(entry.worldEntry.at).toEqual(at);
  });

  describe("place records", () => {
    const entities = [
      { id: "r-1", title: "Nombe", type: "location", content: "x".repeat(500) },
      { id: "r-2", title: "Orra", type: "character", content: "y" },
    ];

    it("lists only ids, titles and types from the in-memory index", async () => {
      const getWorldSnapshot = vi.fn().mockResolvedValue({
        entities,
        calendar: DEFAULT_CALENDAR,
      });
      const service = new AdventureContextService({
        getById: vi.fn(),
        search: vi.fn(),
        getWorldSnapshot,
      });
      await expect(service.listPlaceRecords("vault-1")).resolves.toEqual([
        { id: "r-1", title: "Nombe", type: "location" },
        { id: "r-2", title: "Orra", type: "character" },
      ]);
      expect(getWorldSnapshot).toHaveBeenCalledWith("vault-1");
    });

    it("says unknown, not empty, when there is no world snapshot", async () => {
      const service = new AdventureContextService({
        getById: vi.fn(),
        search: vi.fn(),
      });
      await expect(
        service.listPlaceRecords("vault-1"),
      ).resolves.toBeUndefined();
    });

    it("lets a closed Vault's error through for the caller to handle", async () => {
      const service = new AdventureContextService({
        getById: vi.fn(),
        search: vi.fn(),
        getWorldSnapshot: vi
          .fn()
          .mockRejectedValue(new Error("vault-not-open")),
      });
      await expect(service.listPlaceRecords("vault-1")).rejects.toThrow(
        "vault-not-open",
      );
    });
  });
});
