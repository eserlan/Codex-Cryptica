import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Entity, Map as MapRecord } from "schema";
import { HexDiscoveryService } from "hex-crawl-engine";
import { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
import { appEventBus } from "@codex/events";
import {
  HexDiscoveryController,
  type HexDiscoveryControllerDeps,
  type HexMapPort,
  type HexVaultPort,
} from "./hex-discovery";

const MAP_ID = "33333333-3333-4333-8333-333333333333";
const NOW = 1_700_000_000_000;
const HEX = { q: 0, r: 0 };

const VALID_OUTPUT = {
  landmark: {
    title: "The Glass Obelisk",
    description: "A spire of fused glass.",
  },
  encounter: { title: "Dust Wardens", description: "Riders watch the road." },
  hazard: "Sand drifts bury the path.",
  secret: "The obelisk hums at night.",
  factionPresence: {
    faction: "Dune Wardens",
    description: "They patrol this hex.",
  },
  atmosphere: "The air shimmers like water.",
};

interface PinLike {
  id: string;
  mapId: string;
  entityId?: string;
  coordinates: { x: number; y: number };
  hexCoordinates?: { q: number; r: number };
  visuals: Record<string, unknown>;
}

function pin(entityId: string, q: number, r: number): PinLike {
  return {
    id: `pin-${entityId}`,
    mapId: MAP_ID,
    entityId,
    coordinates: { x: 0, y: 0 },
    hexCoordinates: { q, r },
    visuals: {},
  };
}

function entity(
  id: string,
  type: string,
  title: string,
  labels: string[] = [],
): Entity {
  return {
    id,
    type,
    title,
    labels,
    content: "",
    status: "draft",
  } as unknown as Entity;
}

interface Harness {
  controller: HexDiscoveryController;
  store: HexCrawlStore;
  vault: HexVaultPort & {
    entities: Record<string, Entity>;
    maps: Record<string, unknown>;
  };
  mapStore: HexMapPort & { pinAtHex: ReturnType<typeof vi.fn> };
  generateContent: ReturnType<typeof vi.fn>;
  getModel: ReturnType<typeof vi.fn>;
}

function setup(
  options: {
    guest?: boolean;
    aiDisabled?: boolean;
    modelText?: string | ((signal?: AbortSignal) => Promise<never> | string);
    pins?: PinLike[];
    entities?: Entity[];
    terrain?: boolean;
  } = {},
): Harness {
  const map = {
    id: MAP_ID,
    name: "Overland",
    pins: options.pins ?? [],
    hexCrawl: options.terrain === false ? undefined : undefined,
  } as unknown as MapRecord;
  const maps: Record<string, unknown> = { [MAP_ID]: map };
  const store = new HexCrawlStore({
    getMap: (id) => maps[id] as MapRecord | undefined,
    saveMaps: vi.fn(async () => true),
    clock: { now: () => NOW },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => options.guest === true,
  });
  if (options.terrain !== false) {
    void store.setTerrain(MAP_ID, HEX, { kind: "preset", id: "desert" });
  }

  const entities: Record<string, Entity> = Object.fromEntries(
    (options.entities ?? []).map((e) => [e.id, e]),
  );
  let created = 0;
  const vault = {
    entities,
    maps,
    createEntity: vi.fn(
      async (type: string, title: string, _data?: Partial<Entity>) => {
        created += 1;
        const id = `new-${created}`;
        entities[id] = entity(id, type, title);
        return id;
      },
    ),
    addConnection: vi.fn(async () => undefined),
  };

  const generateContent = vi.fn(
    async (_request: unknown, _options?: { signal?: AbortSignal }) => {
      const text = options.modelText ?? JSON.stringify(VALID_OUTPUT);
      if (typeof text === "function") {
        return { response: { text: () => text(_options?.signal) } };
      }
      return { response: { text: () => text } };
    },
  );
  const getModel = vi.fn(async () => ({ generateContent }));
  const mapStore = {
    activeMapId: MAP_ID,
    formatHex: (hex: { q: number; r: number }) => `${hex.q},${hex.r}`,
    pinAtHex: vi.fn(async () => undefined),
  };

  const deps: HexDiscoveryControllerDeps = {
    service: new HexDiscoveryService({
      rng: () => 0.42,
      clock: { now: () => NOW },
    }),
    aiClient: { getModel } as unknown as HexDiscoveryControllerDeps["aiClient"],
    settings: { effectiveApiKey: "test-key", modelName: "test-model" },
    isAiDisabled: () => options.aiDisabled === true,
    isGuest: () => options.guest === true,
    vault: vault as unknown as HexDiscoveryControllerDeps["vault"],
    mapStore,
    store,
    clock: { now: () => NOW },
  };
  return {
    controller: new HexDiscoveryController(deps),
    store,
    vault: vault as Harness["vault"],
    mapStore,
    generateContent,
    getModel,
  };
}

describe("HexDiscoveryController (T060, FR-021, FR-043)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("explores with AI: calls the model once and persists an AI draft with six pending parts", async () => {
    const h = setup();

    const result = await h.controller.explore(
      MAP_ID,
      HEX,
      new AbortController().signal,
    );

    expect(h.getModel).toHaveBeenCalledTimes(1);
    expect(result.draft?.source).toBe("ai");
    expect(
      Object.values(result.draft!.parts).every((p) => p.status === "pending"),
    ).toBe(true);
    expect(h.store.recordFor(MAP_ID, HEX)?.draft?.source).toBe("ai");
  });

  it("removes remote Markdown and HTML images from saved AI entity content", async () => {
    const modelOutput = {
      ...VALID_OUTPUT,
      landmark: {
        title: "The Glass Obelisk",
        description:
          'A spire. ![tracking](https://tracker.example/pixel.png) <img src="https://tracker.example/raw.png">',
      },
    };
    const h = setup({ modelText: JSON.stringify(modelOutput) });
    await h.controller.explore(MAP_ID, HEX, new AbortController().signal);
    expect(
      h.store.recordFor(MAP_ID, HEX)?.draft?.parts.landmark.text,
    ).not.toContain("https://tracker.example");

    const legacyDraft = h.store.recordFor(MAP_ID, HEX)?.draft;
    expect(legacyDraft).toBeDefined();
    await h.store.setDraft(MAP_ID, HEX, {
      ...legacyDraft!,
      parts: {
        ...legacyDraft!.parts,
        landmark: {
          ...legacyDraft!.parts.landmark,
          text: 'Old draft\n![tracking](https://tracker.example/pixel.png) <img src="https://tracker.example/raw.png">',
        },
      },
    });
    await h.controller.saveEntityPart(MAP_ID, HEX, "landmark", {
      linkTicked: false,
    });

    const savedEntity = vi.mocked(h.vault.createEntity).mock.calls[0]?.[2];
    expect(savedEntity?.content).toContain("tracking");
    expect(savedEntity?.content).not.toContain("https://tracker.example");
    expect(savedEntity?.content).not.toContain("![");
    expect(savedEntity?.content).not.toContain("<img");
  });

  it("returns the pending draft instead of generating again", async () => {
    const h = setup();
    await h.controller.explore(MAP_ID, HEX, new AbortController().signal);
    h.getModel.mockClear();

    const again = await h.controller.explore(
      MAP_ID,
      HEX,
      new AbortController().signal,
    );

    expect(h.getModel).not.toHaveBeenCalled();
    expect(again.draft?.source).toBe("ai");
  });

  it("does not persist a result if its signal was aborted during generation", async () => {
    const h = setup();
    const deps = (
      h.controller as unknown as { deps: HexDiscoveryControllerDeps }
    ).deps;
    let finish!: (
      result: Awaited<ReturnType<HexDiscoveryService["generate"]>>,
    ) => void;
    deps.service = {
      generate: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    } as unknown as HexDiscoveryService;
    const controller = new AbortController();
    const pending = h.controller.explore(MAP_ID, HEX, controller.signal);
    controller.abort();
    finish({
      draft: {
        source: "ai",
        createdAt: NOW,
        parts: {
          landmark: { text: "A", source: "ai", status: "pending" },
          encounter: { text: "B", source: "ai", status: "pending" },
          hazard: { text: "C", source: "ai", status: "pending" },
          secret: { text: "D", source: "ai", status: "pending" },
          factionPresence: { text: "E", source: "ai", status: "pending" },
          atmosphere: { text: "F", source: "ai", status: "pending" },
        },
      },
      fellBackToTables: false,
    });

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(h.store.recordFor(MAP_ID, HEX)?.draft).toBeUndefined();
  });

  it("never calls the model when AI is disabled, and rolls on the tables instead (FR-043)", async () => {
    const h = setup({ aiDisabled: true });

    const result = await h.controller.explore(
      MAP_ID,
      HEX,
      new AbortController().signal,
    );

    expect(h.getModel).not.toHaveBeenCalled();
    expect(h.generateContent).not.toHaveBeenCalled();
    expect(result.draft?.source).toBe("tables");
    expect(h.store.recordFor(MAP_ID, HEX)?.draft?.source).toBe("tables");
  });

  it("reports a failure without saving when the model output is invalid", async () => {
    const h = setup({ modelText: "not json at all" });

    const result = await h.controller.explore(
      MAP_ID,
      HEX,
      new AbortController().signal,
    );

    expect(result.failure).toBe("ai-failed");
    expect(h.store.recordFor(MAP_ID, HEX)?.draft).toBeUndefined();
  });

  it("leaves the record unchanged when the discovery is cancelled mid-generation (FR-033)", async () => {
    const h = setup({
      modelText: (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    const controller = new AbortController();

    const pending = h.controller.explore(MAP_ID, HEX, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(h.store.recordFor(MAP_ID, HEX)?.draft).toBeUndefined();
  });

  it("rejects every write in a guest vault and never calls the model (FR-032)", async () => {
    const h = setup({ guest: true });
    const signal = new AbortController().signal;

    await expect(h.controller.explore(MAP_ID, HEX, signal)).rejects.toThrow();
    await expect(h.controller.rollTables(MAP_ID, HEX)).rejects.toThrow();
    await expect(h.controller.discardDraft(MAP_ID, HEX)).rejects.toThrow();
    await expect(
      h.controller.saveNotePart(MAP_ID, HEX, "hazard"),
    ).rejects.toThrow();
    await expect(
      h.controller.saveEntityPart(MAP_ID, HEX, "landmark", {
        linkTicked: false,
      }),
    ).rejects.toThrow();
    await expect(
      h.controller.saveFactionPart(MAP_ID, HEX, { createIfMissing: true }),
    ).rejects.toThrow();
    expect(h.getModel).not.toHaveBeenCalled();
    expect(h.vault.createEntity).not.toHaveBeenCalled();
  });

  it("regenerate changes only the named part and keeps the other five unchanged (FR-023)", async () => {
    const h = setup({ aiDisabled: true });
    const first = await h.controller.explore(
      MAP_ID,
      HEX,
      new AbortController().signal,
    );
    const before = first.draft!;

    const next = await h.controller.regenerate(
      MAP_ID,
      HEX,
      "hazard",
      new AbortController().signal,
    );

    for (const part of [
      "landmark",
      "encounter",
      "secret",
      "factionPresence",
      "atmosphere",
    ] as const) {
      expect(next.draft!.parts[part]).toEqual(before.parts[part]);
    }
    expect(h.store.recordFor(MAP_ID, HEX)?.draft).toEqual(next.draft);
  });

  it("discardPart marks one part discarded and discardDraft removes the draft", async () => {
    const h = setup({ aiDisabled: true });
    await h.controller.rollTables(MAP_ID, HEX);

    await h.controller.discardPart(MAP_ID, HEX, "secret");
    expect(h.store.recordFor(MAP_ID, HEX)?.draft?.parts.secret.status).toBe(
      "discarded",
    );

    await h.controller.discardDraft(MAP_ID, HEX);
    expect(h.store.recordFor(MAP_ID, HEX)?.draft).toBeUndefined();
  });

  it("saveEntityPart creates the entity, pins it at the hex and publishes a saved capture", async () => {
    const emit = vi.spyOn(appEventBus, "emit");
    const h = setup({ aiDisabled: true });
    await h.controller.rollTables(MAP_ID, HEX);

    const { entityId } = await h.controller.saveEntityPart(
      MAP_ID,
      HEX,
      "landmark",
      {
        linkTicked: false,
      },
    );

    expect(entityId).toBe("new-1");
    expect(h.vault.createEntity).toHaveBeenCalledWith(
      "location",
      expect.any(String),
      expect.objectContaining({
        status: "draft",
        labels: expect.arrayContaining(["hex-crawl-discovery"]),
      }),
    );
    expect(h.mapStore.pinAtHex).toHaveBeenCalledWith(MAP_ID, "new-1", HEX);
    expect(h.vault.addConnection).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "JOURNAL:CAPTURE" }),
    );
    emit.mockRestore();
  });

  it("links the landmark to the nearest location only when the link is still ticked", async () => {
    const town = entity("town", "location", "Greyfield");
    const h = setup({
      aiDisabled: true,
      entities: [town],
      pins: [pin("town", 1, 0)],
    });
    await h.controller.rollTables(MAP_ID, HEX);
    expect(await h.controller.proposedLinkFor(MAP_ID, HEX)).toEqual({
      entityId: "town",
      title: "Greyfield",
    });

    await h.controller.saveEntityPart(MAP_ID, HEX, "landmark", {
      linkTicked: false,
    });
    expect(h.vault.addConnection).not.toHaveBeenCalled();

    await h.controller.rollTables(MAP_ID, HEX);
    await h.controller.saveEntityPart(MAP_ID, HEX, "encounter", {
      linkTicked: true,
    });
    expect(h.vault.addConnection).toHaveBeenCalledWith(
      "new-2",
      "town",
      "related_to",
    );
  });

  it("proposes no link when no location is within two hexes, and to guests it proposes nothing", async () => {
    const far = entity("far", "location", "Far Keep");
    const h = setup({ entities: [far], pins: [pin("far", 5, 0)] });
    expect(await h.controller.proposedLinkFor(MAP_ID, HEX)).toBeNull();

    const guest = setup({
      guest: true,
      entities: [far],
      pins: [pin("far", 1, 0)],
    });
    expect(await guest.controller.proposedLinkFor(MAP_ID, HEX)).toBeNull();
  });

  it("saveNotePart appends to AI-drafted notes only and never touches the GM's notes (FR-027)", async () => {
    const h = setup({ aiDisabled: true });
    await h.store.setNotes(MAP_ID, HEX, "My own words.");
    await h.controller.rollTables(MAP_ID, HEX);

    await h.controller.saveNotePart(MAP_ID, HEX, "hazard");

    const record = h.store.recordFor(MAP_ID, HEX);
    expect(record?.notes).toBe("My own words.");
    expect(record?.aiNotes).toMatch(/^Hazard: /);
  });

  it("saveFactionPart links an existing faction to entities saved from this hex", async () => {
    const faction = entity("dunes", "faction", "Dune Wardens");
    const saved = entity("obelisk", "location", "The Obelisk", [
      "hex-crawl-discovery",
    ]);
    const h = setup({
      entities: [faction, saved],
      pins: [pin("obelisk", 0, 0)],
    });
    await h.controller.explore(MAP_ID, HEX, new AbortController().signal);

    const result = await h.controller.saveFactionPart(MAP_ID, HEX, {
      createIfMissing: false,
    });

    expect(result.factionId).toBe("dunes");
    expect(h.vault.addConnection).toHaveBeenCalledWith(
      "obelisk",
      "dunes",
      "related_to",
    );
    expect(h.store.recordFor(MAP_ID, HEX)?.aiNotes).toContain(
      "Faction presence: Dune Wardens",
    );
  });

  it("saveFactionPart writes nothing when the faction is missing and creation is not allowed (negative)", async () => {
    const h = setup();
    await h.controller.explore(MAP_ID, HEX, new AbortController().signal);

    const result = await h.controller.saveFactionPart(MAP_ID, HEX, {
      createIfMissing: false,
    });

    expect(result.factionId).toBeNull();
    expect(h.vault.createEntity).not.toHaveBeenCalled();
    expect(h.store.recordFor(MAP_ID, HEX)?.aiNotes).toBeUndefined();
  });

  it("saveFactionPart creates the faction when allowed", async () => {
    const h = setup();
    await h.controller.explore(MAP_ID, HEX, new AbortController().signal);

    const result = await h.controller.saveFactionPart(MAP_ID, HEX, {
      createIfMissing: true,
    });

    expect(result.factionId).toBe("new-1");
    expect(h.vault.createEntity).toHaveBeenCalledWith(
      "faction",
      "Dune Wardens",
      expect.any(Object),
    );
  });
});
