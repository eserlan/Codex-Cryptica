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
