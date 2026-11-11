import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import type { Entity } from "schema";
import {
  classifyEntityAt,
  resolveTemporalWorldContext,
} from "./temporal-world-context";

const year = (n: number) => ({ year: n });
function link(target: string, label: string) {
  return { target, type: "associated", strength: 1, label };
}

function entity(
  id: string,
  type: string,
  options: Partial<Entity> = {},
): Entity {
  return {
    id,
    type,
    title: id,
    content: id + " canon description",
    labels: [],
    aliases: [],
    connections: [],
    status: "active",
    ...options,
  } as Entity;
}

const calendar = {
  ...DEFAULT_CALENDAR,
  eras: [
    {
      id: "after-fall",
      name: "After the Fall",
      startYear: 600,
      yearAtStart: 1,
    },
  ],
};

const records: Entity[] = [
  entity("guard", "character", {
    connections: [link("capital", "lives in")],
  }),
  entity("capital", "location", {
    connections: [
      link("king", "residence of"),
      link("faction", "controlled by"),
      link("notice", "mentioned in"),
    ],
  }),
  entity("king", "character", {
    start_date: year(600),
    end_date: year(620),
    lore: "The king's secret illness is not public.",
    connections: [link("death", "dies during")],
  }),
  entity("death", "event", {
    title: "Death of the King",
    date: year(620),
    content: "King dies in year 620.",
  }),
  entity("faction", "faction", {
    connections: [link("alliance", "signed")],
  }),
  entity("alliance", "event", {
    date: year(621),
    content: "Alliance concluded in year 621.",
  }),
  entity("notice", "note", {
    content: "No dates have been established.",
    lore: "An unrelated confidential plot.",
  }),
  entity("hidden", "event", {
    date: year(617),
    visibility: "hidden",
    connections: [link("king", "targets")],
  }),
  entity("hidden-undated", "note", {
    visibility: "hidden",
    content: "Hidden undated record",
    connections: [link("king", "secret connection")],
  }),
  entity("dated-only-person", "character", {
    date: year(600),
    content: "A character known to be present in year 600.",
    connections: [link("capital", "knows the ruler")],
  }),
  entity("secret-link", "event", {
    date: year(617),
    content: "The secret council met in 617.",
    connections: [
      {
        target: "capital",
        type: "associated",
        strength: 1,
        label: "concealed meeting",
        hidden: true,
      },
    ],
  }),
  entity("remote", "location", {
    content: "A distant, unconnected city.",
    date: year(601),
  }),
];

function resolve(
  at: { year: number },
  overrides: Partial<Parameters<typeof resolveTemporalWorldContext>[0]> = {},
) {
  return resolveTemporalWorldContext({
    entities: records,
    calendar,
    characterId: "guard",
    locationId: "capital",
    at,
    ...overrides,
  });
}

describe("resolveTemporalWorldContext", () => {
  it("keeps the king alive in 618 while withholding his later death and alliance", () => {
    const result = resolve(year(618));
    const king = result.gmOnly.find((r) => r.id === "king");
    const death = result.gmOnly.find((r) => r.id === "death");
    const alliance = result.gmOnly.find((r) => r.id === "alliance");
    expect(king?.applicability).toBe("established");
    expect(death?.applicability).toBe("future");
    expect(alliance?.applicability).toBe("future");
    expect(result.playerSafe.map((r) => r.id)).toContain("king");
    expect(result.playerSafe.map((r) => r.id)).not.toContain("death");
    expect(result.playerSafe.map((r) => r.id)).not.toContain("alliance");
  });

  it("does not interpret a generic character date as a death or end date", () => {
    const result = resolve(year(618));
    expect(
      result.gmOnly.find((r) => r.id === "dated-only-person")?.applicability,
    ).toBe("uncertain");
    expect(result.playerSafe.map((r) => r.id)).not.toContain(
      "dated-only-person",
    );
    expect(result.unresolved.map((r) => r.id)).toContain("dated-only-person");
  });

  it("includes explicitly selected undated character and location without inventing dates", () => {
    const result = resolve(year(618));
    for (const id of ["guard", "capital"]) {
      expect(result.playerSafe.find((r) => r.id === id)?.applicability).toBe(
        "uncertain",
      );
    }
  });

  it("never exposes a publicly visible record reached only through a hidden connection", () => {
    const result = resolve(year(618));
    expect(result.gmOnly.map((r) => r.id)).toContain("secret-link");
    expect(result.playerSafe.map((r) => r.id)).not.toContain("secret-link");
    expect(result.unresolved.map((r) => r.id)).not.toContain("secret-link");
  });

  it("does not treat a year-only death as already known in that year", () => {
    expect(
      resolve(year(620)).gmOnly.find((r) => r.id === "death")?.applicability,
    ).toBe("uncertain");
    expect(
      resolve(year(621)).gmOnly.find((r) => r.id === "death")?.applicability,
    ).toBe("historical");
  });

  it("separates confidential lore and undated sources from public assumptions", () => {
    const result = resolve(year(618));
    const publicData = JSON.stringify(result.playerSafe);
    expect(publicData).not.toContain("secret illness");
    expect(publicData).not.toContain("confidential plot");
    expect(publicData).not.toContain("No dates have been established.");
    expect(result.gmOnly.find((r) => r.id === "notice")?.applicability).toBe(
      "uncertain",
    );
    expect(result.gmOnly.find((r) => r.id === "hidden")?.applicability).toBe(
      "historical",
    );
    expect(result.playerSafe.map((r) => r.id)).not.toContain("hidden");
    expect(result.unresolved.map((r) => r.id)).toContain("notice");
    expect(result.unresolved.map((r) => r.id)).not.toContain("hidden-undated");
  });

  it("includes direct and second-hop connected records but excludes unrelated canon", () => {
    const result = resolve(year(618));
    expect(result.gmOnly.map((r) => r.id)).toContain("death");
    expect(result.gmOnly.map((r) => r.id)).not.toContain("remote");
  });

  it("bounds record count and content while keeping character and place", () => {
    const result = resolve(year(618), { maxRecords: 3, maxExcerptChars: 40 });
    expect(result.gmOnly).toHaveLength(3);
    expect(result.gmOnly.map((r) => r.id)).toContain("guard");
    expect(result.gmOnly.map((r) => r.id)).toContain("capital");
    expect(result.omitted).toBeGreaterThan(0);
    expect(result.gmOnly.every((r) => r.content.length <= 40)).toBe(true);
  });

  it("rejects invalid start locations, characters and calendar dates", () => {
    expect(() => resolve(year(618), { locationId: "remote-unknown" })).toThrow(
      "temporal-world-location-not-found",
    );
    expect(() => resolve(year(618), { characterId: "capital" })).toThrow(
      "temporal-world-character-not-found",
    );
    expect(() => resolve({ year: Number.NaN })).toThrow(
      "temporal-world-invalid-date",
    );
  });

  it("flags contradictory event windows rather than asserting them", () => {
    const contradictory = entity("bad", "event", {
      start_date: year(624),
      end_date: year(620),
      connections: [link("capital", "involves")],
    });
    const result = resolve(year(618), {
      entities: [...records, contradictory],
    });
    expect(result.gmOnly.find((r) => r.id === "bad")?.applicability).toBe(
      "contradictory",
    );
    expect(result.playerSafe.map((r) => r.id)).not.toContain("bad");
  });

  it("does not mutate the Vault records or depend on Gregorian date parsing", () => {
    const before = JSON.stringify(records);
    const result = resolve(year(618));
    expect(JSON.stringify(records)).toBe(before);
    expect(result.gmOnly.find((r) => r.id === "king")?.dateLabel).toContain(
      "After the Fall",
    );
  });

  it("keeps a selected future location GM-only and a selected contradictory one unresolved", () => {
    const futureVillage = entity("future-village", "location", {
      start_date: year(621),
    });
    const future = resolve(year(618), {
      entities: [...records, futureVillage],
      locationId: "future-village",
    });
    expect(
      future.gmOnly.find((r) => r.id === "future-village")?.applicability,
    ).toBe("future");
    expect(future.playerSafe.map((r) => r.id)).not.toContain("future-village");
    expect(future.unresolved.map((r) => r.id)).not.toContain("future-village");

    const brokenVillage = entity("broken-village", "location", {
      start_date: year(625),
      end_date: year(610),
    });
    const contradictory = resolve(year(618), {
      entities: [...records, brokenVillage],
      locationId: "broken-village",
    });
    expect(contradictory.playerSafe.map((r) => r.id)).not.toContain(
      "broken-village",
    );
    expect(
      contradictory.unresolved.find((r) => r.id === "broken-village")
        ?.applicability,
    ).toBe("contradictory");
  });

  it("keeps undated biography prose out of the player-safe layer", () => {
    const king = entity("king", "character", {
      start_date: year(600),
      end_date: year(620),
      content: "A stern ruler. He dies in 620 after the siege.",
    });
    const result = resolve(year(618), {
      entities: records.map((r) => (r.id === "king" ? king : r)),
    });
    const safe = result.playerSafe.find((r) => r.id === "king");
    expect(safe?.applicability).toBe("established");
    expect(JSON.stringify(result.playerSafe)).not.toContain("dies in 620");
    expect(safe?.content).toContain("king");
    // Oracle (GM) still receives the full source text.
    expect(result.gmOnly.find((r) => r.id === "king")?.content).toContain(
      "dies in 620",
    );
  });

  it("does not reach established records only through a withheld future record", () => {
    const entities = [
      entity("pc", "character", {}),
      entity("village", "location", {
        connections: [link("treaty", "signed at")],
      }),
      entity("treaty", "event", {
        date: year(621),
        connections: [link("envoy", "negotiated by")],
      }),
      entity("envoy", "character", { start_date: year(590) }),
    ];
    const result = resolveTemporalWorldContext({
      entities,
      calendar,
      characterId: "pc",
      locationId: "village",
      at: year(618),
    });
    expect(result.gmOnly.map((r) => r.id)).toContain("envoy");
    expect(result.playerSafe.map((r) => r.id)).not.toContain("envoy");
    expect(result.unresolved.map((r) => r.id)).not.toContain("envoy");

    // Through an established intermediary, the same record is reachable.
    const viaPast = entities.map((r) =>
      r.id === "treaty" ? { ...r, date: year(610) } : r,
    );
    const reachable = resolveTemporalWorldContext({
      entities: viaPast,
      calendar,
      characterId: "pc",
      locationId: "village",
      at: year(618),
    });
    expect(reachable.playerSafe.map((r) => r.id)).toContain("envoy");
  });

  it("uses a placed anchor's day instead of widening it to the whole year", () => {
    const anchored = {
      ...DEFAULT_CALENDAR,
      revision: 1,
      anchors: [
        {
          id: "midsummer",
          name: "Midsummer",
          afterMonthId: "june",
          afterDay: 30,
        },
      ],
    };
    const festival = entity("festival", "event", {
      date: {
        precision: "anchor",
        year: 618,
        anchorId: "midsummer",
        calendarRevision: 1,
      },
      connections: [link("capital", "held in")],
    } as Partial<Entity>);
    const result = resolveTemporalWorldContext({
      entities: [...records, festival],
      calendar: anchored,
      characterId: "guard",
      locationId: "capital",
      at: {
        precision: "day",
        year: 618,
        unitId: "december",
        day: 1,
        calendarRevision: 1,
      },
    });
    expect(result.gmOnly.find((r) => r.id === "festival")?.applicability).toBe(
      "historical",
    );

    const before = resolveTemporalWorldContext({
      entities: [...records, festival],
      calendar: anchored,
      characterId: "guard",
      locationId: "capital",
      at: {
        precision: "day",
        year: 618,
        unitId: "march",
        day: 1,
        calendarRevision: 1,
      },
    });
    expect(before.gmOnly.find((r) => r.id === "festival")?.applicability).toBe(
      "future",
    );
  });

  it("rejects a target date saved under an older calendar revision", () => {
    expect(() =>
      resolveTemporalWorldContext({
        entities: records,
        calendar: { ...DEFAULT_CALENDAR, revision: 2 },
        characterId: "guard",
        locationId: "capital",
        at: { precision: "year", year: 618, calendarRevision: 1 },
      }),
    ).toThrow("temporal-world-invalid-date");
  });

  it("keeps source dates from an older calendar revision unresolved", () => {
    const stale = entity("stale", "event", {
      date: { precision: "year", year: 610, calendarRevision: 1 },
      connections: [link("capital", "happened in")],
    } as Partial<Entity>);
    const result = resolveTemporalWorldContext({
      entities: [...records, stale],
      calendar: { ...DEFAULT_CALENDAR, revision: 2 },
      characterId: "guard",
      locationId: "capital",
      at: { precision: "year", year: 618, calendarRevision: 2 },
    });
    expect(result.playerSafe.map((r) => r.id)).not.toContain("stale");
    expect(result.unresolved.map((r) => r.id)).toContain("stale");
  });

  it("classifies dates with only one canonical root", () => {
    const result = resolve(year(618), { characterId: undefined });
    expect(result.characterId).toBeUndefined();
    expect(result.gmOnly.find((r) => r.id === "king")?.applicability).toBe(
      "established",
    );
    expect(result.gmOnly.find((r) => r.id === "death")?.applicability).toBe(
      "future",
    );
    expect(() =>
      resolve(year(618), { characterId: undefined, locationId: undefined }),
    ).toThrow("temporal-world-no-canonical-root");
  });

  it("stays fast for a hub with thousands of direct neighbours", () => {
    const spokes = Array.from({ length: 3_000 }, (_, i) =>
      entity("spoke-" + i, "note", { connections: [link("hub", "near")] }),
    );
    const hub = entity("hub", "location", {
      connections: spokes.map((spoke) => link(spoke.id, "near")),
    });
    const started = performance.now();
    const result = resolveTemporalWorldContext({
      entities: [entity("pc", "character"), hub, ...spokes],
      calendar,
      characterId: "pc",
      locationId: "hub",
      at: year(618),
    });
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(result.omitted).toBeGreaterThan(0);
  });
});

describe("fictional clock and temporal precision", () => {
  const shortCalendar = {
    ...DEFAULT_CALENDAR,
    useGregorian: false,
    months: [
      { id: "bloom", name: "Bloom", days: 2 },
      { id: "frost", name: "Frost", days: 3 },
    ],
  };
  const town = entity("town", "location", {
    connections: [link("festival", "held in town")],
  });
  const festival = entity("festival", "event", {
    date: { year: 619, month: 1, day: 1 },
    content: "A festival is held on Bloom 1, 619.",
  });
  const query = {
    entities: [town, festival],
    calendar: shortCalendar,
    locationId: "town",
    at: { year: 618, month: 2, day: 3 },
  };

  it("reclassifies upcoming events without changing the start date", () => {
    const before = resolveTemporalWorldContext(query);
    expect(
      before.gmOnly.find((r) => r.id === "festival")?.applicability,
    ).toBe("future");
    expect(before.playerSafe.some((r) => r.id === "festival")).toBe(false);
    const after = resolveTemporalWorldContext({
      ...query,
      elapsedMinutes: 2 * 1_440,
    });
    expect(
      after.gmOnly.find((r) => r.id === "festival")?.applicability,
    ).toBe("historical");
    expect(after.playerSafe.some((r) => r.id === "festival")).toBe(true);
    expect(after.at).toEqual(query.at);
    expect(query.at).toEqual({ year: 618, month: 2, day: 3 });
  });

  it("does not invent a start hour or day from an imprecise date", () => {
    const partialDay = resolveTemporalWorldContext({
      ...query,
      elapsedMinutes: 60,
    });
    expect(
      partialDay.gmOnly.find((r) => r.id === "festival")?.applicability,
    ).toBe("uncertain");

    const yearOnly = resolveTemporalWorldContext({
      ...query,
      at: { year: 618 },
      elapsedMinutes: 2 * 1_440,
    });
    expect(
      yearOnly.gmOnly.find((r) => r.id === "festival")?.applicability,
    ).toBe("uncertain");
    expect(yearOnly.playerSafe.some((r) => r.id === "festival")).toBe(false);
  });

  it("uses custom months and rejects invalid clock values", () => {
    expect(classifyEntityAt(festival, query.at, shortCalendar)).toBe("future");
    expect(
      classifyEntityAt(festival, query.at, shortCalendar, 2 * 1_440),
    ).toBe("historical");
    expect(() =>
      resolveTemporalWorldContext({
        ...query,
        elapsedMinutes: -1,
      }),
    ).toThrow("temporal-world-invalid-date");
    expect(() =>
      resolveTemporalWorldContext({
        ...query,
        elapsedMinutes: 1.5,
      }),
    ).toThrow("temporal-world-invalid-date");
  });
});

it("TEMP_FORMAT_PROBE", async () => {
  const prettier = await import("prettier");
  const { readFile } = await import("node:fs/promises");
  const path = new URL(import.meta.url).pathname;
  const original = await readFile(path, "utf8");
  const marker = '\nit("TEMP_FORMAT_PROBE"';
  const clean = original.slice(0, original.indexOf(marker));
  const typescript = await import("prettier/plugins/typescript");
  const estree = await import("prettier/plugins/estree");
  const formatted = await prettier.format(clean, {
    filepath: path,
    parser: "typescript",
    plugins: [typescript, estree],
  });
  const fragment = formatted.slice(
    formatted.indexOf('describe("fictional clock and temporal precision"'),
  );
  console.log("FORMAT_PROBE_OUTPUT_" + JSON.stringify(fragment));
});
