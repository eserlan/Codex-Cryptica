import { describe, expect, it } from "vitest";
import {
  mapHubGenreToShipGenre,
  resolveHubGeneratorGenre,
  shouldSyncGeneratorTheme,
} from "./generator-theme-maps";

describe("resolveHubGeneratorGenre", () => {
  it("maps a known hub theme to its generator genre", () => {
    expect(resolveHubGeneratorGenre("cyberpunk")).toBe("Cyberpunk");
    expect(resolveHubGeneratorGenre("vampire")).toBe("Horror");
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
  });

  it("is false for an unrecognized slug", () => {
    expect(shouldSyncGeneratorTheme("not-a-real-slug")).toBe(false);
  });
});

describe("mapHubGenreToShipGenre", () => {
  it("passes through genres the ship generator supports directly", () => {
    expect(mapHubGenreToShipGenre("Cyberpunk")).toBe("Cyberpunk");
    expect(mapHubGenreToShipGenre("Fantasy")).toBe("Fantasy");
  });

  it("remaps genres the ship generator names differently", () => {
    expect(mapHubGenreToShipGenre("Western")).toBe("Western (River & Rail)");
    expect(mapHubGenreToShipGenre("Horror")).toBe("Dark Fantasy");
  });

  it("falls back to Sci-Fi for an unrecognized genre", () => {
    expect(mapHubGenreToShipGenre("Not A Genre")).toBe("Sci-Fi");
  });
});
