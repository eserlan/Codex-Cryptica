import { describe, it, expect } from "vitest";
import {
  getThemeDefaults,
  THEME_GENERATOR_DEFAULTS,
} from "./campaign-generator-theme";
import {
  npcRacesForTheme,
  npcRolesForTheme,
  factionTypesForTheme,
  settlementTypesForTheme,
  adventureArchetypesForTheme,
  adventureTonesForTheme,
} from "./campaign-generator-registry";
import { adventureConfig } from "./public-adventure-constants";
import { themeIdToLabel } from "./public-faction-constants";

describe("theme-to-generator defaults (US3, T039)", () => {
  it("covers all real world-theme ids", () => {
    const expectedThemes = [
      "workspace",
      "fantasy",
      "scifi",
      "modern",
      "horror",
      "cosmic_horror",
      "cyberpunk",
    ];
    for (const theme of expectedThemes) {
      expect(THEME_GENERATOR_DEFAULTS).toHaveProperty(theme);
    }
  });

  it("fantasy NPC has expected defaults", () => {
    expect(getThemeDefaults("fantasy", "npc")).toMatchObject({
      race: "Human",
      role: "Warrior",
    });
  });

  it("horror NPC has a Vampire / Gothic Noir role", () => {
    expect(getThemeDefaults("horror", "npc").role).toBe("Private Detective");
  });

  it("cyberpunk settlement is District", () => {
    expect(getThemeDefaults("cyberpunk", "settlement").type).toBe("District");
  });

  it("horror faction is a Vampire / Gothic Noir type", () => {
    expect(getThemeDefaults("horror", "faction").type).toBe(
      "Cult of the Damned",
    );
  });

  it("cosmic horror defaults to investigation instead of vampire tropes", () => {
    expect(getThemeDefaults("cosmic_horror", "npc").role).toBe("Investigator");
    expect(getThemeDefaults("cosmic_horror", "faction").type).toBe(
      "Research Society",
    );
  });

  it("workspace returns empty defaults (neutral theme)", () => {
    expect(getThemeDefaults("workspace", "npc")).toEqual({});
  });

  it("unknown theme returns empty object (safe fallback)", () => {
    expect(getThemeDefaults("gothic", "npc")).toEqual({});
  });

  it("every theme's npc race/role defaults are valid choices for that theme's dropdown", () => {
    for (const themeId of Object.keys(THEME_GENERATOR_DEFAULTS)) {
      const defaults = getThemeDefaults(themeId, "npc");
      if (defaults.race) {
        expect(npcRacesForTheme(themeId)).toContain(defaults.race);
      }
      if (defaults.role) {
        expect(npcRolesForTheme(themeId)).toContain(defaults.role);
      }
    }
  });

  it("every theme's faction/settlement type defaults are valid choices for that theme's dropdown", () => {
    for (const themeId of Object.keys(THEME_GENERATOR_DEFAULTS)) {
      const factionDefaults = getThemeDefaults(themeId, "faction");
      if (factionDefaults.type) {
        expect(factionTypesForTheme(themeId)).toContain(factionDefaults.type);
      }
      const settlementDefaults = getThemeDefaults(themeId, "settlement");
      if (settlementDefaults.type) {
        expect(settlementTypesForTheme(themeId)).toContain(
          settlementDefaults.type,
        );
      }
    }
  });
});

describe("adventure generator theme choices", () => {
  it("offers only the theme's own types and tones, not every genre's", () => {
    const fantasyTypes = adventureArchetypesForTheme("fantasy");
    const all = adventureConfig.archetypes;
    expect(fantasyTypes.length).toBeGreaterThan(0);
    expect(fantasyTypes.length).toBeLessThan(all.length);
    expect(adventureTonesForTheme("fantasy").length).toBeLessThan(
      adventureConfig.tones.length,
    );
    expect(adventureArchetypesForTheme("scifi")).not.toEqual(fantasyTypes);
  });

  it("every theme has at least one type and tone, and unknown themes fall back", () => {
    for (const themeId of Object.keys(themeIdToLabel)) {
      expect(adventureArchetypesForTheme(themeId).length).toBeGreaterThan(0);
      expect(adventureTonesForTheme(themeId).length).toBeGreaterThan(0);
    }
    expect(adventureArchetypesForTheme("no-such-theme")).toEqual(
      adventureArchetypesForTheme("fantasy"),
    );
  });
});
