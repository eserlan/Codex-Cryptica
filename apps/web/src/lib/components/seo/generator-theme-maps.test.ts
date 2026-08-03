import { describe, expect, it } from "vitest";
import {
  mapHubGenreToShipGenre,
  mapShipGenreToTheme,
  mapWorldGenreToTheme,
  resolveHubGeneratorGenre,
  shouldSyncGeneratorTheme,
} from "./generator-theme-maps";

describe("resolveHubGeneratorGenre", () => {
  it("maps a known hub theme to its generator genre", () => {
    expect(resolveHubGeneratorGenre("cyberpunk")).toBe("Cyberpunk");
    expect(resolveHubGeneratorGenre("vampire")).toBe("Horror");
    expect(resolveHubGeneratorGenre("cosmic-horror")).toBe("Cosmic Horror");
    expect(resolveHubGeneratorGenre("space-opera-resistance")).toBe(
      "Space Opera Resistance",
    );
  });

  it("returns null for an unknown or missing theme", () => {
    expect(resolveHubGeneratorGenre(null)).toBeNull();
    expect(resolveHubGeneratorGenre("not-a-real-theme")).toBeNull();
  });
});

describe("shouldSyncGeneratorTheme", () => {
  it("is true for slugs that participate in theme syncing", () => {
    expect(shouldSyncGeneratorTheme("faction")).toBe(true);
    expect(shouldSyncGeneratorTheme("ship-generator")).toBe(true);
    expect(shouldSyncGeneratorTheme("language-generator")).toBe(true);
    expect(shouldSyncGeneratorTheme("world")).toBe(true);
  });

  it("is false for an unrecognized slug", () => {
    expect(shouldSyncGeneratorTheme("not-a-real-slug")).toBe(false);
  });
});

describe("mapHubGenreToShipGenre", () => {
  it("passes through genres the ship generator supports directly", () => {
    expect(mapHubGenreToShipGenre("Cyberpunk")).toBe("Cyberpunk");
    expect(mapHubGenreToShipGenre("Fantasy")).toBe("Fantasy");
    expect(mapHubGenreToShipGenre("Pirate")).toBe("Pirate / Age of Sail");
  });

  it("remaps genres the ship generator names differently", () => {
    expect(mapHubGenreToShipGenre("Western")).toBe("Western (River & Rail)");
    expect(mapHubGenreToShipGenre("Horror")).toBe("Dark Fantasy");
  });

  it("falls back to Sci-Fi for an unrecognized genre", () => {
    expect(mapHubGenreToShipGenre("Not A Genre")).toBe("Sci-Fi");
  });
});

describe("mapShipGenreToTheme", () => {
  it("maps ship selector genres to layout theme labels", () => {
    expect(mapShipGenreToTheme("Pirate / Age of Sail")).toBe("Pirate");
    expect(mapShipGenreToTheme("Cyberpunk")).toBe("Cyberpunk / Corporate");
    expect(mapShipGenreToTheme("Fantasy")).toBe("Classic Fantasy");
  });

  it("leaves custom ship genres unchanged", () => {
    expect(mapShipGenreToTheme("Custom Private Vessel")).toBeNull();
  });
});

describe("mapWorldGenreToTheme", () => {
  it("uses the dedicated Star Wars skin for Space Opera", () => {
    expect(mapWorldGenreToTheme("Space Opera")).toBe("Star Wars");
  });

  it("preserves the existing World Generator genre skins", () => {
    expect(mapWorldGenreToTheme("Hard Sci-Fi")).toBe("Sci-Fi / Space Opera");
    expect(mapWorldGenreToTheme("Cyberpunk")).toBe("Cyberpunk / Corporate");
    expect(mapWorldGenreToTheme("Hopeful Sci-Fi")).toBe(
      "Optimistic Exploration Sci-Fi",
    );
  });
});
