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
  SPACE_OPERA_RESISTANCE_DARK,
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

  it("assigns the correct SVG textures to the target themes", () => {
    const expectedTextures: Record<string, string> = {
      workspace: "workspace_grain.svg",
      workspace_dark: "workspace_grain.svg",
      scifi: "scifi_grid.svg",
      // scifi_light ("Starship Bridge", #1456) intentionally has no texture —
      // a clean solid surface, asserted separately below.
      modern: "modern_dots.svg",
      modern_dark: "modern_dots.svg",
      starwars: "holocron.svg",
      starwars_light: "holocron.svg",
      startrek: "stellar_map.svg",
      startrek_light: "stellar_map.svg",
      lancer: "tactical_hud.svg",
      lancer_light: "tactical_hud.svg",
      "space-opera-resistance": "resistance_console.svg",
      "space-opera-resistance_dark": "resistance_console.svg",
      horror_light: "autopsy_smudge.svg",
      fallout_light: "vault_blueprint.svg",
    };

    const themesMap: Record<string, any> = {
      workspace: THEMES.workspace,
      workspace_dark: WORKSPACE_DARK,
      scifi: THEMES.scifi,
      modern: THEMES.modern,
      modern_dark: MODERN_DARK,
      starwars: THEMES.starwars,
      starwars_light: STARWARS_LIGHT,
      startrek: THEMES.startrek,
      startrek_light: STARTREK_LIGHT,
      lancer: THEMES.lancer,
      lancer_light: LANCER_LIGHT,
      "space-opera-resistance": THEMES["space-opera-resistance"],
      "space-opera-resistance_dark": SPACE_OPERA_RESISTANCE_DARK,
      horror_light: HORROR_LIGHT,
      fallout_light: FALLOUT_LIGHT,
    };

    for (const [id, texture] of Object.entries(expectedTextures)) {
      const theme = themesMap[id];
      expect(theme).toBeDefined();
      expect(theme.tokens.texture).toBe(texture);

      // Expected success path: ends with .svg
      expect(texture.endsWith(".svg")).toBe(true);

      // Negative path: should not contain directory traversal paths
      expect(texture).not.toContain("/");
      expect(texture).not.toContain("\\");
      expect(texture).not.toContain("..");
    }

    // scifi_light is deliberately texture-free (clean Starship Bridge surface).
    expect(SCIFI_LIGHT.tokens.texture).toBeUndefined();
  });
});
