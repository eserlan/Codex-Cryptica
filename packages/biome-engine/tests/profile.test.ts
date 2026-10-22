import { describe, expect, it } from "bun:test";
import { BiomeProfileSchema } from "schema";
import {
  setReferenceLinks,
  addAlteration,
  removeAlteration,
  updateAlteration,
  computeDepartures,
  createBlankProfile,
  createProfileFromReference,
  setOwnClimate,
  setOwnField,
} from "../src/profile";
import { getBiome } from "../src/catalogue";

const tundra = getBiome("tundra")!;

describe("createProfileFromReference", () => {
  it("snapshots the reference, including resolved sources, and leaves own fields empty", () => {
    const profile = createProfileFromReference(tundra, 1234);
    expect(profile.version).toBe(1);
    expect(profile.reference?.biomeId).toBe("tundra");
    expect(profile.reference?.name).toBe("Tundra");
    expect(profile.reference?.capturedAt).toBe(1234);
    expect(profile.reference?.landscape).toEqual(tundra.landscape);
    expect(profile.reference?.sources.length).toBeGreaterThan(0);
    expect(profile.own.terrain).toBe("");
    expect(profile.own.vegetation).toBe("");
    expect(profile.alterations).toEqual([]);
  });

  it("produces a profile the saved-record schema accepts", () => {
    const profile = createProfileFromReference(tundra, 1);
    expect(BiomeProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("copies rather than shares the reference data", () => {
    const profile = createProfileFromReference(tundra, 1);
    expect(profile.reference?.landscape).not.toBe(tundra.landscape);
    expect(profile.reference?.landscape[0]).not.toBe(tundra.landscape[0]);
  });
});

describe("createBlankProfile", () => {
  it("has no reference and passes the schema", () => {
    const blank = createBlankProfile();
    expect(blank.reference).toBeNull();
    expect(BiomeProfileSchema.safeParse(blank).success).toBe(true);
  });
});

describe("setOwnField / setOwnClimate", () => {
  it("returns a new profile and never touches the original or the reference", () => {
    const original = createProfileFromReference(tundra, 1);
    const referenceBefore = JSON.stringify(original.reference);
    const edited = setOwnField(original, "vegetation", "Glowing moss");
    expect(edited).not.toBe(original);
    expect(original.own.vegetation).toBe("");
    expect(edited.own.vegetation).toBe("Glowing moss");
    expect(JSON.stringify(edited.reference)).toBe(referenceBefore);
  });

  it("sets climate values without losing other climate values", () => {
    let profile = createBlankProfile();
    profile = setOwnClimate(profile, { seasonality: "Monsoon all year" });
    profile = setOwnClimate(profile, {
      temperature: { low: 10, high: 20, unit: "°C" },
    });
    expect(profile.own.climate.seasonality).toBe("Monsoon all year");
    expect(profile.own.climate.temperature?.high).toBe(20);
  });

  it("rejects text over 4,000 characters", () => {
    const profile = createBlankProfile();
    expect(() => setOwnField(profile, "terrain", "x".repeat(4001))).toThrow(
      RangeError,
    );
    expect(
      setOwnField(profile, "terrain", "x".repeat(4000)).own.terrain,
    ).toHaveLength(4000);
  });
});

describe("computeDepartures", () => {
  it("marks only the aspects the user has changed", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "vegetation", "Glowing moss");
    const departures = computeDepartures(profile);
    const byAspect = Object.fromEntries(departures.map((d) => [d.aspect, d]));
    expect(byAspect.vegetation.changed).toBe(true);
    expect(byAspect.vegetation.ownText).toBe("Glowing moss");
    expect(byAspect.vegetation.referenceSummary).toContain(
      tundra.vegetation[0].text,
    );
    expect(byAspect.terrain.changed).toBe(false);
    expect(byAspect.water.changed).toBe(false);
  });

  it("treats a climate value as a change", () => {
    const profile = setOwnClimate(createProfileFromReference(tundra, 1), {
      precipitation: { low: 900, high: 1200, unit: "mm per year" },
    });
    const climate = computeDepartures(profile).find(
      (d) => d.aspect === "climate",
    )!;
    expect(climate.changed).toBe(true);
  });

  it("treats whitespace-only text as unchanged", () => {
    const profile = setOwnField(
      createProfileFromReference(tundra, 1),
      "water",
      "   ",
    );
    expect(
      computeDepartures(profile).find((d) => d.aspect === "water")!.changed,
    ).toBe(false);
  });

  it("works for a blank profile with an empty reference summary", () => {
    const departures = computeDepartures(createBlankProfile());
    expect(
      departures.every((d) => d.referenceSummary === "" && !d.changed),
    ).toBe(true);
  });
});

describe("alterations", () => {
  it("adds an alteration without changing the original profile", () => {
    const original = createBlankProfile();
    const next = addAlteration(
      original,
      {
        aspect: "climate",
        description: "Ash rain",
        cause: "A sleeping volcano",
      },
      "a1",
    );
    expect(original.alterations).toEqual([]);
    expect(next.alterations).toEqual([
      {
        id: "a1",
        aspect: "climate",
        description: "Ash rain",
        cause: "A sleeping volcano",
        effects: [],
      },
    ]);
  });

  it("allows an empty cause", () => {
    const next = addAlteration(
      createBlankProfile(),
      { aspect: "water", description: "Black rivers" },
      "a1",
    );
    expect(next.alterations[0].cause).toBe("");
  });

  it("rejects an empty or blank description and an unknown aspect", () => {
    const blank = createBlankProfile();
    expect(() =>
      addAlteration(blank, { aspect: "climate", description: "  " }, "a"),
    ).toThrow();
    expect(() =>
      addAlteration(blank, { aspect: "magic" as never, description: "x" }, "a"),
    ).toThrow();
  });

  it("updates and removes an alteration by id, leaving others alone", () => {
    let profile = createBlankProfile();
    profile = addAlteration(
      profile,
      { aspect: "climate", description: "A" },
      "a1",
    );
    profile = addAlteration(
      profile,
      { aspect: "water", description: "B" },
      "a2",
    );
    profile = updateAlteration(profile, "a1", {
      cause: "Because",
      effects: ["Fog"],
    });
    expect(profile.alterations[0]).toMatchObject({
      cause: "Because",
      effects: ["Fog"],
    });
    expect(profile.alterations[1].description).toBe("B");
    expect(() =>
      updateAlteration(profile, "a1", { description: "" }),
    ).toThrow();
    profile = removeAlteration(profile, "a1");
    expect(profile.alterations.map((a) => a.id)).toEqual(["a2"]);
    expect(removeAlteration(profile, "missing").alterations).toHaveLength(1);
  });

  it("keeps alterations out of the reference snapshot and the departures", () => {
    const base = createProfileFromReference(tundra, 1);
    const next = addAlteration(
      base,
      { aspect: "vegetation", description: "Glass trees" },
      "a1",
    );
    expect(JSON.stringify(next.reference)).toBe(JSON.stringify(base.reference));
    expect(computeDepartures(next).every((d) => !d.changed)).toBe(true);
  });
});

describe("setReferenceLinks", () => {
  it("keeps https links and rejects other schemes, returning what it rejected", () => {
    const result = setReferenceLinks(createBlankProfile(), [
      { url: "https://example.com/a", label: "A" },
      { url: "http://example.com/b", label: "B" },
      { url: "javascript:alert(1)", label: "C" },
      { url: "not a url", label: "D" },
    ]);
    expect(result.profile.referenceLinks).toEqual([
      { url: "https://example.com/a", label: "A" },
    ]);
    expect(result.rejected).toEqual([
      "http://example.com/b",
      "javascript:alert(1)",
      "not a url",
    ]);
  });

  it("allows at most 10 links and reports the extras as rejected", () => {
    const links = Array.from({ length: 12 }, (_, i) => ({
      url: `https://example.com/${i}`,
      label: String(i),
    }));
    const result = setReferenceLinks(createBlankProfile(), links);
    expect(result.profile.referenceLinks).toHaveLength(10);
    expect(result.rejected).toEqual([
      "https://example.com/10",
      "https://example.com/11",
    ]);
  });

  it("does not change the original profile and trims labels and addresses", () => {
    const original = createBlankProfile();
    const result = setReferenceLinks(original, [
      { url: "  https://example.com/a  ", label: "  Tidy  " },
    ]);
    expect(original.referenceLinks).toEqual([]);
    expect(result.profile.referenceLinks[0]).toEqual({
      url: "https://example.com/a",
      label: "Tidy",
    });
  });
});
