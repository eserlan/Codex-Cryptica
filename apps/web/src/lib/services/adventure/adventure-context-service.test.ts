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
    const service = new AdventureContextService({
      getById: vi.fn(),
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
  });
});
