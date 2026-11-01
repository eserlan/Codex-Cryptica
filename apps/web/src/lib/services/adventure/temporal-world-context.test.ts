import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import type { Entity } from "schema";
import { resolveTemporalWorldContext } from "./temporal-world-context";

const year = (n: number) => ({ year: n });
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
    { id: "after-fall", name: "After the Fall", startYear: 600, yearAtStart: 1 },
  ],
};

const records: Entity[] = [
  entity("guard", "character", {
    connections: [{ target: "capital", label: "lives in" }],
  }),
  entity("capital", "location", {
    connections: [
      { target: "king", label: "residence of" },
      { target: "faction", label: "controlled by" },
      { target: "notice", label: "mentioned in" },
    ],
  }),
  entity("king", "character", {
    start_date: year(600),
    end_date: year(620),
    lore: "The king's secret illness is not public.",
    connections: [{ target: "death", label: "dies during" }],
  }),
  entity("death", "event", {
    title: "Death of the King",
    date: year(620),
    content: "King dies in year 620.",
  }),
  entity("faction", "faction", {
    connections: [{ target: "alliance", label: "signed" }],
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
    connections: [{ target: "king", label: "targets" }],
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

  it("does not treat a year-only death as already known in that year", () => {
    expect(
      resolve(year(620)).gmOnly.find((r) => r.id === "death")
        ?.applicability,
    ).toBe("uncertain");
    expect(
      resolve(year(621)).gmOnly.find((r) => r.id === "death")
        ?.applicability,
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
    expect(() =>
      resolve(year(618), { locationId: "remote-unknown" }),
    ).toThrow("temporal-world-location-not-found");
    expect(() =>
      resolve(year(618), { characterId: "capital" }),
    ).toThrow("temporal-world-character-not-found");
    expect(() =>
      resolve({ year: Number.NaN }),
    ).toThrow("temporal-world-invalid-date");
  });

  it("flags contradictory event windows rather than asserting them", () => {
    const contradictory = entity("bad", "event", {
      start_date: year(624),
      end_date: year(620),
      connections: [{ target: "capital", label: "involves" }],
    });
    const result = resolve(year(618), {
      entities: [...records, contradictory],
    });
    expect(
      result.gmOnly.find((r) => r.id === "bad")?.applicability,
    ).toBe("contradictory");
    expect(result.playerSafe.map((r) => r.id)).not.toContain("bad");
  });

  it("does not mutate the Vault records or depend on Gregorian date parsing", () => {
    const before = JSON.stringify(records);
    const result = resolve(year(618));
    expect(JSON.stringify(records)).toBe(before);
    expect(
      result.gmOnly.find((r) => r.id === "king")?.dateLabel,
    ).toContain("After the Fall");
  });
});
