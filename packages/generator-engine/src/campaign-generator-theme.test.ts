import { describe, it, expect } from "vitest";
import {
  getThemeDefaults,
  THEME_GENERATOR_DEFAULTS,
} from "./campaign-generator-theme";

describe("theme-to-generator defaults (US3, T039)", () => {
  it("covers all real world-theme ids", () => {
    const expectedThemes = [
      "workspace",
      "fantasy",
      "scifi",
      "modern",
      "horror",
      "cyberpunk",
    ];
    for (const theme of expectedThemes) {
      expect(THEME_GENERATOR_DEFAULTS).toHaveProperty(theme);
    }
  });

  it("fantasy NPC has expected defaults", () => {
    expect(getThemeDefaults("fantasy", "npc")).toMatchObject({
      race: "Human",
      role: "Adventurer",
    });
  });

  it("horror NPC has Survivor role", () => {
    expect(getThemeDefaults("horror", "npc").role).toBe("Survivor");
  });

  it("cyberpunk settlement is City", () => {
    expect(getThemeDefaults("cyberpunk", "settlement").type).toBe("City");
  });

  it("horror faction is Cult", () => {
    expect(getThemeDefaults("horror", "faction").type).toBe("Cult");
  });

  it("workspace returns empty defaults (neutral theme)", () => {
    expect(getThemeDefaults("workspace", "npc")).toEqual({});
  });

  it("unknown theme returns empty object (safe fallback)", () => {
    expect(getThemeDefaults("gothic", "npc")).toEqual({});
  });
});
