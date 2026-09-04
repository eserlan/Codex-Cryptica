import { describe, expect, it } from "vitest";
import {
  parseDevelopWorldHandoff,
  worldGenreForHub,
} from "./generator-page-world-handoff";

describe("worldGenreForHub", () => {
  it("maps known hub genres to their world genre", () => {
    expect(worldGenreForHub("Cyberpunk")).toBe("Cyberpunk");
    expect(worldGenreForHub("Optimistic Exploration Sci-Fi")).toBe(
      "Hopeful Sci-Fi",
    );
    expect(worldGenreForHub("Space Opera Resistance")).toBe("Space Opera");
    expect(worldGenreForHub("Lancer")).toBe("Lancer");
  });

  it("falls back to Hard Sci-Fi for an unrecognized or missing hub genre", () => {
    expect(worldGenreForHub(null)).toBe("Hard Sci-Fi");
    expect(worldGenreForHub("Not A Real Genre")).toBe("Hard Sci-Fi");
  });
});

describe("parseDevelopWorldHandoff", () => {
  it("builds a dominant feature from a linked major body's name, type, and context", () => {
    const params = new URLSearchParams({
      developSystem: "Kepler Reach",
      developBody: "Aurum Station",
      developBodyType: "orbital habitat",
      developContext: "seized by pirate clans during the last war.",
    });

    const result = parseDevelopWorldHandoff(params);

    expect(result).toEqual({
      dominantFeature:
        "Aurum Station (orbital habitat) — seized by pirate clans during the last war.",
      paramKeys: [
        "developSystem",
        "developBody",
        "developBodyType",
        "developContext",
      ],
    });
  });

  it("returns null when neither developSystem nor developBody is present", () => {
    const params = new URLSearchParams({ developContext: "orphaned context" });

    expect(parseDevelopWorldHandoff(params)).toBeNull();
  });

  it("returns null when developSystem is present but developBody is not", () => {
    const params = new URLSearchParams({ developSystem: "Kepler Reach" });

    expect(parseDevelopWorldHandoff(params)).toBeNull();
  });

  it("never leaks a literal null into the dominant feature when developSystem and developContext are missing", () => {
    const params = new URLSearchParams({ developBody: "Aurum Station" });

    const result = parseDevelopWorldHandoff(params);

    expect(result?.dominantFeature).toBe("Aurum Station");
    expect(result?.dominantFeature).not.toContain("null");
  });
});
