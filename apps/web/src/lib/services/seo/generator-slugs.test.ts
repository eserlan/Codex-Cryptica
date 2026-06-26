import { describe, it, expect } from "vitest";
import {
  shouldSyncGeneratorTheme,
  resolveHubGeneratorGenre,
  GENERATOR_SLUGS_WITH_THEME,
} from "./generator-slugs";

describe("generator-slugs", () => {
  describe("shouldSyncGeneratorTheme", () => {
    it("returns true for slugs that support themes", () => {
      expect(shouldSyncGeneratorTheme("npc")).toBe(true);
      expect(shouldSyncGeneratorTheme("faction")).toBe(true);
      expect(shouldSyncGeneratorTheme("ship-generator")).toBe(true);
    });

    it("returns false for unknown slugs", () => {
      expect(shouldSyncGeneratorTheme("unknown-generator-slug")).toBe(false);
      expect(shouldSyncGeneratorTheme("")).toBe(false);
    });
  });

  describe("resolveHubGeneratorGenre", () => {
    it("maps known hub themes to generator genres", () => {
      expect(resolveHubGeneratorGenre("cyberpunk")).toBe("Cyberpunk");
      expect(resolveHubGeneratorGenre("fantasy")).toBe("Fantasy");
      expect(resolveHubGeneratorGenre("optimistic-exploration-sci-fi")).toBe(
        "Optimistic Exploration Sci-Fi",
      );
    });

    it("returns null for unknown themes", () => {
      expect(resolveHubGeneratorGenre("unknown-theme")).toBe(null);
    });

    it("returns null when passed null", () => {
      expect(resolveHubGeneratorGenre(null)).toBe(null);
    });
  });

  describe("GENERATOR_SLUGS_WITH_THEME", () => {
    it("contains expected entries", () => {
      expect(GENERATOR_SLUGS_WITH_THEME.has("npc")).toBe(true);
      expect(GENERATOR_SLUGS_WITH_THEME.has("settlement")).toBe(true);
      expect(GENERATOR_SLUGS_WITH_THEME.size).toBeGreaterThan(10);
    });
  });
});
