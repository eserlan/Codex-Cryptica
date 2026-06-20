import { describe, it, expect } from "vitest";
import {
  THEMES,
  DEFAULT_THEME,
  WORKSPACE_DARK,
  FANTASY_DARK,
  MODERN_DARK,
  SCIFI_LIGHT,
  CYBERPUNK_LIGHT,
  APOCALYPTIC_LIGHT,
  HORROR_LIGHT,
  FALLOUT_LIGHT,
  STARWARS_LIGHT,
  STARTREK_LIGHT,
  LANCER_LIGHT,
  WESTERN_DARK,
  StylingTemplateSchema,
} from "./theme";

describe("Theme Schema & Definitions", () => {
  it("defines the workspace and workspace_dark themes", () => {
    expect(THEMES.workspace).toBeDefined();
    expect(THEMES.workspace.id).toBe("workspace");
    expect(THEMES.workspace.tokens.fontHeader).toContain("Fraunces");
    expect(THEMES.workspace.tokens.fontBody).toContain("Inter");
    expect(THEMES.workspace.tokens.borderRadius).toBe("8px");

    expect(WORKSPACE_DARK).toBeDefined();
    expect(WORKSPACE_DARK.id).toBe("workspace_dark");
    expect(WORKSPACE_DARK.tokens.fontHeader).toContain("Fraunces");
    expect(WORKSPACE_DARK.tokens.fontBody).toContain("Inter");
    expect(WORKSPACE_DARK.tokens.borderRadius).toBe("8px");
  });

  it("sets workspace as the DEFAULT_THEME", () => {
    expect(DEFAULT_THEME.id).toBe("workspace");
  });

  it("refines fantasy theme tokens with distinct heading/body fonts and reduced graph weights", () => {
    const fantasy = THEMES.fantasy;
    expect(fantasy).toBeDefined();
    // fontHeader should not be equal to fontBody in refined fantasy
    expect(fantasy.tokens.fontHeader).not.toBe(fantasy.tokens.fontBody);
    expect(fantasy.tokens.fontHeader).toContain("Alegreya");
    expect(fantasy.tokens.fontBody).toContain("Inter");

    // Reduced graph edge weight/opacity checking
    expect(fantasy.graph.edgeWidth).toBeLessThanOrEqual(2); // Reduced from 3
  });

  it("defines light and dark counterparts for all 11 world themes", () => {
    const counterparts: Record<string, { light: any; dark: any }> = {
      workspace: { light: THEMES.workspace, dark: WORKSPACE_DARK },
      scifi: { light: SCIFI_LIGHT, dark: THEMES.scifi },
      fantasy: { light: THEMES.fantasy, dark: FANTASY_DARK },
      modern: { light: THEMES.modern, dark: MODERN_DARK },
      cyberpunk: { light: CYBERPUNK_LIGHT, dark: THEMES.cyberpunk },
      apocalyptic: { light: APOCALYPTIC_LIGHT, dark: THEMES.apocalyptic },
      horror: { light: HORROR_LIGHT, dark: THEMES.horror },
      fallout: { light: FALLOUT_LIGHT, dark: THEMES.fallout },
      starwars: { light: STARWARS_LIGHT, dark: THEMES.starwars },
      startrek: { light: STARTREK_LIGHT, dark: THEMES.startrek },
      lancer: { light: LANCER_LIGHT, dark: THEMES.lancer },
      western: { light: THEMES.western, dark: WESTERN_DARK },
    };

    for (const [key, pair] of Object.entries(counterparts)) {
      expect(pair.light).toBeDefined();
      expect(pair.dark).toBeDefined();

      const expectedLightId =
        key === "workspace" ||
        key === "fantasy" ||
        key === "modern" ||
        key === "western"
          ? key
          : `${key}_light`;
      const expectedDarkId =
        key === "workspace" ||
        key === "fantasy" ||
        key === "modern" ||
        key === "western"
          ? `${key}_dark`
          : key;

      expect(pair.light.id).toBe(expectedLightId);
      expect(pair.dark.id).toBe(expectedDarkId);

      // Verify both satisfy StylingTemplate schema
      expect(() => StylingTemplateSchema.parse(pair.light)).not.toThrow();
      expect(() => StylingTemplateSchema.parse(pair.dark)).not.toThrow();

      // Verify jargon is identical
      expect(pair.light.jargon).toEqual(pair.dark.jargon);
    }
  });
});
