import { describe, it, expect } from "vitest";
import { StylingTemplateSchema } from "./theme";
import {
  THEMES,
  DEFAULT_THEME,
  WORKSPACE_DARK,
  FANTASY_DARK,
  PIRATE_DARK,
  MODERN_DARK,
  SCIFI_LIGHT,
  CYBERPUNK_LIGHT,
  APOCALYPTIC_LIGHT,
  HORROR_LIGHT,
  COSMIC_HORROR_LIGHT,
  FALLOUT_LIGHT,
  STARWARS_LIGHT,
  STARTREK_LIGHT,
  LANCER_LIGHT,
  WESTERN_DARK,
  SPACE_OPERA_RESISTANCE_DARK,
  SPACE_WESTERN_LIGHT,
} from "./theme-templates";

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

  it("defines FANTASY_DARK with WCAG AA compliant text contrast and complete semantic tokens", () => {
    expect(FANTASY_DARK).toBeDefined();
    expect(FANTASY_DARK.id).toBe("fantasy_dark");
    expect(() => StylingTemplateSchema.parse(FANTASY_DARK)).not.toThrow();

    const tokens = FANTASY_DARK.tokens;

    // Helper for relative luminance according to WCAG 2.1/2.2 specs
    function relativeLuminance(hex: string): number {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const [cr, cg, cb] = [r, g, b].map((c) =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
      );
      return 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
    }

    function contrastRatio(hex1: string, hex2: string): number {
      const l1 = relativeLuminance(hex1);
      const l2 = relativeLuminance(hex2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // Backgrounds: canvas background (#1c1410), surface (#2a1e16), effective textured background (#241c18)
    const backgrounds = [tokens.background, tokens.surface, "#241c18"];

    for (const bg of backgrounds) {
      // 1.4.3 Normal body text (>= 4.5:1)
      expect(contrastRatio(tokens.text, bg)).toBeGreaterThanOrEqual(4.5);

      // 1.4.3 Secondary / muted readable text (>= 4.5:1)
      expect(contrastRatio(tokens.secondary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(tokens.metaText).toBeDefined();
      expect(contrastRatio(tokens.metaText!, bg)).toBeGreaterThanOrEqual(4.5);

      // Links / interactive primary text (>= 4.5:1)
      expect(contrastRatio(tokens.primary, bg)).toBeGreaterThanOrEqual(4.5);

      // 1.4.11 Non-text contrast: interactive icons and focus indicator (>= 3:1)
      expect(tokens.iconDefault).toBeDefined();
      expect(contrastRatio(tokens.iconDefault!, bg)).toBeGreaterThanOrEqual(
        3.0,
      );
      expect(tokens.iconActive).toBeDefined();
      expect(contrastRatio(tokens.iconActive!, bg)).toBeGreaterThanOrEqual(3.0);
      expect(tokens.focus).toBeDefined();
      expect(contrastRatio(tokens.focus!, bg)).toBeGreaterThanOrEqual(3.0);
    }

    // CTA Open Codex button contrast: action text against action background
    expect(
      contrastRatio(tokens.actionText!, tokens.actionBg!),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("defines the Pirate light and dark themes with nautical contrast tokens", () => {
    expect(THEMES.pirate.id).toBe("pirate");
    expect(PIRATE_DARK.id).toBe("pirate_dark");
    expect(THEMES.pirate.tokens.primary).toBe("#164e63");
    expect(PIRATE_DARK.tokens.accent).toBe("#d0a456");
    expect(() => StylingTemplateSchema.parse(THEMES.pirate)).not.toThrow();
    expect(() => StylingTemplateSchema.parse(PIRATE_DARK)).not.toThrow();
  });

  it("defines HORROR_LIGHT as an Archival Dossier in cold aged ivory, charcoal, and oxblood", () => {
    expect(HORROR_LIGHT.id).toBe("horror_light");
    expect(HORROR_LIGHT.name).toBe("Archival Dossier");
    expect(HORROR_LIGHT.tokens.primary).toBe("#801414");
    expect(HORROR_LIGHT.tokens.accent).toBe("#801414");
    expect(HORROR_LIGHT.tokens.background).toBe("#e4dfd5");
    expect(HORROR_LIGHT.tokens.text).toBe("#1c1917");
    expect(HORROR_LIGHT.tokens.secondary).toBe("#4a4543");
    expect(HORROR_LIGHT.tokens.borderRadius).toBe("0px");
    expect(() => StylingTemplateSchema.parse(HORROR_LIGHT)).not.toThrow();
  });

  it("defines light and dark counterparts for all world themes", () => {
    const counterparts: Record<string, { light: any; dark: any }> = {
      workspace: { light: THEMES.workspace, dark: WORKSPACE_DARK },
      scifi: { light: SCIFI_LIGHT, dark: THEMES.scifi },
      fantasy: { light: THEMES.fantasy, dark: FANTASY_DARK },
      pirate: { light: THEMES.pirate, dark: PIRATE_DARK },
      modern: { light: THEMES.modern, dark: MODERN_DARK },
      cyberpunk: { light: CYBERPUNK_LIGHT, dark: THEMES.cyberpunk },
      apocalyptic: { light: APOCALYPTIC_LIGHT, dark: THEMES.apocalyptic },
      horror: { light: HORROR_LIGHT, dark: THEMES.horror },
      cosmic_horror: {
        light: COSMIC_HORROR_LIGHT,
        dark: THEMES.cosmic_horror,
      },
      fallout: { light: FALLOUT_LIGHT, dark: THEMES.fallout },
      starwars: { light: STARWARS_LIGHT, dark: THEMES.starwars },
      startrek: { light: STARTREK_LIGHT, dark: THEMES.startrek },
      lancer: { light: LANCER_LIGHT, dark: THEMES.lancer },
      western: { light: THEMES.western, dark: WESTERN_DARK },
      "space-western": {
        light: SPACE_WESTERN_LIGHT,
        dark: THEMES["space-western"],
      },
    };

    for (const [key, pair] of Object.entries(counterparts)) {
      expect(pair.light).toBeDefined();
      expect(pair.dark).toBeDefined();

      const expectedLightId =
        key === "workspace" ||
        key === "fantasy" ||
        key === "pirate" ||
        key === "modern" ||
        key === "western"
          ? key
          : `${key}_light`;
      const expectedDarkId =
        key === "workspace" ||
        key === "fantasy" ||
        key === "pirate" ||
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
      pirate: "nautical_chart.svg",
      pirate_dark: "harbour_night.svg",
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
      "space-western": "rust.svg",
      "space-western_light": "rust.svg",
      horror_light: "autopsy_smudge.svg",
      cosmic_horror: "eldritch_cartography.svg",
      cosmic_horror_light: "eldritch_cartography.svg",
      fallout_light: "vault_blueprint.svg",
    };

    const themesMap: Record<string, any> = {
      workspace: THEMES.workspace,
      workspace_dark: WORKSPACE_DARK,
      pirate: THEMES.pirate,
      pirate_dark: PIRATE_DARK,
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
      "space-western": THEMES["space-western"],
      "space-western_light": SPACE_WESTERN_LIGHT,
      horror_light: HORROR_LIGHT,
      cosmic_horror: THEMES.cosmic_horror,
      cosmic_horror_light: COSMIC_HORROR_LIGHT,
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
