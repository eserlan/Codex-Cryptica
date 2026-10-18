import { describe, expect, it } from "bun:test";
import {
  buildHexContext,
  renderHexContext,
  HEX_CONTEXT_LIMITS,
  type HexContextInput,
} from "../src/context";
import type { HexCrawlState, HexRecord } from "../src/model";

const labelFor = (hex: { q: number; r: number }) =>
  `${String(hex.q).padStart(2, "0")}.${String(hex.r).padStart(2, "0")}`;

const state = (hexes: Record<string, Partial<HexRecord>>): HexCrawlState => ({
  enabled: true,
  hexes: Object.fromEntries(
    Object.entries(hexes).map(([k, v]) => [k, { updatedAt: 1, ...v }]),
  ),
});

const base = (overrides: Partial<HexContextInput> = {}): HexContextInput => ({
  hex: { q: 0, r: 0 },
  label: labelFor({ q: 0, r: 0 }),
  record: { terrain: { kind: "preset", id: "forest" }, updatedAt: 1 },
  state: state({}),
  entities: [],
  labelFor,
  ...overrides,
});

describe("buildHexContext (T056)", () => {
  it("includes terrain, notes, contents, region and campaign", () => {
    const ctx = buildHexContext(
      base({
        record: {
          terrain: { kind: "preset", id: "forest" },
          notes: "The road bends here.",
          aiNotes: "A shrine stands in the trees.",
          updatedAt: 1,
        },
        entities: [
          {
            entityId: "a",
            title: "Old Mill",
            type: "location",
            summary: "Ruin.",
            hex: { q: 0, r: 0 },
          },
        ],
        region: { title: "The Marches", summary: "A border region." },
        campaign: "Campaign: the Ashen War.",
      }),
    );
    expect(ctx.hex.terrain).toBe("Forest");
    expect(ctx.hex.notes).toBe("The road bends here.");
    expect(ctx.hex.aiNotes).toBe("A shrine stands in the trees.");
    expect(ctx.contents.map((c) => c.title)).toEqual(["Old Mill"]);
    expect(ctx.region).toEqual({
      title: "The Marches",
      summary: "A border region.",
    });
    expect(ctx.campaign).toBe("Campaign: the Ashen War.");
  });

  it("includes neighbours within radius 2 that have a record or entities, with distance", () => {
    const ctx = buildHexContext(
      base({
        state: state({
          "1,0": { explored: true, terrain: { kind: "preset", id: "hills" } },
          "5,5": { terrain: { kind: "preset", id: "swamp" } },
        }),
        entities: [
          {
            entityId: "n",
            title: "Shepherd",
            type: "npc",
            summary: "Keeps goats.",
            hex: { q: 0, r: 2 },
          },
        ],
      }),
    );
    const labels = ctx.neighbours.map((n) => n.label);
    expect(labels).toContain(labelFor({ q: 1, r: 0 }));
    expect(labels).toContain(labelFor({ q: 0, r: 2 }));
    expect(labels).not.toContain(labelFor({ q: 5, r: 5 }));
    const near = ctx.neighbours.find(
      (n) => n.label === labelFor({ q: 1, r: 0 }),
    );
    expect(near).toMatchObject({
      distance: 1,
      terrain: "Hills",
      explored: true,
    });
  });

  it("lists the nearest locations and factions by distance", () => {
    const ctx = buildHexContext(
      base({
        entities: [
          {
            entityId: "f",
            title: "Iron Guild",
            type: "faction",
            summary: "",
            hex: { q: 4, r: 0 },
          },
          {
            entityId: "l",
            title: "Keep",
            type: "location",
            summary: "",
            hex: { q: 1, r: 1 },
          },
          {
            entityId: "l2",
            title: "Tower",
            type: "location",
            summary: "",
            hex: { q: 9, r: 9 },
          },
        ],
      }),
    );
    expect(ctx.nearestLocations.map((l) => l.title)).toEqual(["Keep", "Tower"]);
    expect(ctx.nearestFactions.map((f) => f.title)).toEqual(["Iron Guild"]);
  });

  it("enforces the count limits", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      entityId: `e${i}`,
      title: `Place ${i}`,
      type: "location",
      summary: "s",
      hex: { q: (i % 3) - 1, r: 0 },
    }));
    const ctx = buildHexContext(base({ entities: many }));
    expect(ctx.nearestLocations.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.nearestLocations,
    );
    expect(ctx.contents.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.contents,
    );
    const factions = Array.from({ length: 9 }, (_, i) => ({
      entityId: `f${i}`,
      title: `Guild ${i}`,
      type: "faction",
      summary: "",
      hex: { q: 1, r: 1 },
    }));
    const ctx2 = buildHexContext(base({ entities: factions }));
    expect(ctx2.nearestFactions.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.nearestFactions,
    );
  });

  it("caps neighbour hexes at 18 and neighbour entities at 12", () => {
    const entities = Array.from({ length: 40 }, (_, i) => ({
      entityId: `e${i}`,
      title: `Npc ${i}`,
      type: "npc",
      summary: "",
      hex: { q: (i % 4) - 1, r: (i % 5) - 2 === 0 ? 1 : 0 },
    })).filter((e) => !(e.hex.q === 0 && e.hex.r === 0));
    const ctx = buildHexContext(base({ entities }));
    expect(ctx.neighbours.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.neighbourHexes,
    );
    const total = ctx.neighbours.reduce((n, h) => n + h.entities.length, 0);
    expect(total).toBeLessThanOrEqual(HEX_CONTEXT_LIMITS.neighbourEntities);
  });

  it("truncates excerpts to their limits", () => {
    const long = "w".repeat(5000);
    const ctx = buildHexContext(
      base({
        record: {
          notes: long,
          updatedAt: 1,
          terrain: { kind: "preset", id: "plains" },
        },
        entities: [
          {
            entityId: "a",
            title: "Big",
            type: "location",
            summary: long,
            hex: { q: 0, r: 0 },
          },
        ],
        campaign: long,
      }),
    );
    expect(ctx.hex.notes!.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.notesExcerpt,
    );
    expect(ctx.contents[0].summary.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.entityExcerpt,
    );
    expect(ctx.campaign!.length).toBeLessThanOrEqual(
      HEX_CONTEXT_LIMITS.campaign,
    );
  });

  it("produces valid context for empty surroundings", () => {
    const ctx = buildHexContext(base({ record: undefined }));
    expect(ctx.hex.label).toBe(labelFor({ q: 0, r: 0 }));
    expect(ctx.hex.terrain).toBeUndefined();
    expect(ctx.neighbours).toEqual([]);
    expect(ctx.nearestLocations).toEqual([]);
    expect(ctx.nearestFactions).toEqual([]);
    expect(ctx.region).toBeUndefined();
    expect(renderHexContext(ctx).length).toBeGreaterThan(0);
  });
});

describe("renderHexContext (T056)", () => {
  it("stays within 8,000 characters", () => {
    const big = "z".repeat(1500);
    const entities = Array.from({ length: 20 }, (_, i) => ({
      entityId: `e${i}`,
      title: `T${i}`,
      type: "location",
      summary: big,
      hex: { q: 0, r: 0 },
    }));
    const text = renderHexContext(
      buildHexContext(
        base({ record: { notes: big, updatedAt: 1 }, entities, campaign: big }),
      ),
    );
    expect(text.length).toBeLessThanOrEqual(HEX_CONTEXT_LIMITS.total);
  });

  it("is deterministic for the same input", () => {
    const input = base({
      entities: [
        {
          entityId: "a",
          title: "A",
          type: "location",
          summary: "x",
          hex: { q: 1, r: 0 },
        },
      ],
    });
    expect(renderHexContext(buildHexContext(input))).toBe(
      renderHexContext(buildHexContext(input)),
    );
  });

  it("truncates an oversized context to the limit rather than throwing", () => {
    const huge = "q".repeat(HEX_CONTEXT_LIMITS.total * 3);
    const text = renderHexContext(
      buildHexContext(base({ record: { notes: huge, updatedAt: 1 } })),
    );
    expect(text.length).toBeLessThanOrEqual(HEX_CONTEXT_LIMITS.total);
    expect(text.length).toBeGreaterThan(0);
  });
});
