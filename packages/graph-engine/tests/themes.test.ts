import { describe, it, expect } from "vitest";
import { getGraphStyle } from "../src/transformer";
import {
  THEMES,
  FANTASY_DARK,
  contrastRatio,
  deriveEntityTypeTone,
  parseColor,
  MIN_GRAPHIC_CONTRAST,
} from "schema";
import type { Category } from "schema";

describe("Graph Theme Generation", () => {
  const mockCategories: Category[] = [
    { id: "npc", label: "NPC", color: "#60a5fa", icon: "user" },
  ];

  it("should generate appropriate node shapes for each theme", () => {
    const scifiStyle = getGraphStyle(THEMES.scifi, mockCategories, false);
    const fantasyStyle = getGraphStyle(THEMES.fantasy, mockCategories, false);
    const cyberpunkStyle = getGraphStyle(
      THEMES.cyberpunk,
      mockCategories,
      false,
    );

    const scifiNode = scifiStyle.find((s) => s.selector === "node")?.style;
    const fantasyNode = fantasyStyle.find((s) => s.selector === "node")?.style;
    const cyberpunkNode = cyberpunkStyle.find(
      (s) => s.selector === "node",
    )?.style;

    expect(scifiNode.shape).toBe("ellipse");
    expect(fantasyNode.shape).toBe("polygon");
    expect(fantasyNode["shape-polygon-points"]).toEqual([
      -0.82, -0.68, 0, -0.96, 0.82, -0.68, 0.72, 0.26, 0, 0.98, -0.72, 0.26,
    ]);
    expect(fantasyNode["background-image"]).toBe(
      "url('/themes/parchment.svg')",
    );
    expect(fantasyNode["background-fit"]).toBe("cover");
    expect(fantasyNode["background-clip"]).toBe("node");
    expect(fantasyNode["border-width"]).toBe(
      THEMES.fantasy.graph.nodeBorderWidth,
    );
    expect(fantasyNode["border-color"]).toBe(THEMES.fantasy.tokens.primary);
    expect(fantasyNode["border-opacity"]).toBe(0.68);
    expect(fantasyNode["shadow-color"]).toBeUndefined();
    expect(fantasyNode["underlay-color"]).toBeUndefined();
    expect(cyberpunkNode.shape).toBe("ellipse");
  });

  it("should generate different edge styles", () => {
    const scifiStyle = getGraphStyle(THEMES.scifi, mockCategories, false);
    const fantasyStyle = getGraphStyle(THEMES.fantasy, mockCategories, false);
    const cyberpunkStyle = getGraphStyle(
      THEMES.cyberpunk,
      mockCategories,
      false,
    );

    const scifiEdge = scifiStyle.find((s) => s.selector === "edge")?.style;
    const fantasyEdge = fantasyStyle.find((s) => s.selector === "edge")?.style;
    const cyberpunkEdge = cyberpunkStyle.find(
      (s) => s.selector === "edge",
    )?.style;

    expect(scifiEdge["line-style"]).toBe("solid");
    expect(fantasyEdge["line-style"]).toBe("dashed");
    expect(fantasyEdge["line-dash-pattern"]).toEqual([13, 4, 2, 5]);
    expect(fantasyEdge["line-cap"]).toBe("round");
    expect(fantasyEdge["underlay-color"]).toBe(
      THEMES.fantasy.tokens.background,
    );
    expect(fantasyEdge.width).toBe(THEMES.fantasy.graph.edgeWidth + 1);
    expect(cyberpunkEdge["line-style"]).toBe("dashed");
  });

  it("should not render selection underlay around fantasy shield nodes", () => {
    const fantasyStyle = getGraphStyle(THEMES.fantasy, mockCategories, false);
    const selectedNode = fantasyStyle.find(
      (s) => s.selector === "node:selected",
    )?.style;

    expect(selectedNode["underlay-opacity"]).toBe(0);
    expect(selectedNode["underlay-shape"]).toBe("polygon");
  });

  it("should include rotated texture variants for the vampire theme", () => {
    const horrorStyle = getGraphStyle(THEMES.horror, mockCategories, false);

    expect(
      horrorStyle.find((s) => s.selector === "node[textureVariant = 1]")?.style[
        "background-image"
      ],
    ).toBe("url('/themes/blood-90.svg')");
    expect(
      horrorStyle.find((s) => s.selector === "node[textureVariant = 2]")?.style[
        "background-image"
      ],
    ).toBe("url('/themes/blood-180.svg')");
    expect(
      horrorStyle.find((s) => s.selector === "node[textureVariant = 3]")?.style[
        "background-image"
      ],
    ).toBe("url('/themes/blood-270.svg')");
  });

  describe("silhouette placement", () => {
    const silhouetteStyle = (theme: (typeof THEMES)["fantasy"]) =>
      getGraphStyle(theme, mockCategories, true).find(
        (s) =>
          s.selector ===
          "node[isSilhouette][resolvedImage][resolvedImage != 'none']",
      )?.style;

    it("sizes the glyph itself instead of letting cytoscape refit it", () => {
      const style = silhouetteStyle(THEMES.scifi);
      expect(
        style,
        "silhouette selector missing from the stylesheet",
      ).toBeDefined();

      // `contain` re-scales the image to fill the node box, which cancels the
      // percentage below and spills the glyph outside round/pointed nodes.
      expect(style["background-fit"]).toBe("none");
      expect(style["background-width"]).toBe("72%");
      expect(style["background-height"]).toBe("72%");
      expect(style["background-position-x"]).toBe("50%");
      expect(style["background-position-y"]).toBe("50%");
    });

    it("keeps the glyph inside the fantasy shield, which tapers to a point", () => {
      const style = silhouetteStyle(THEMES.fantasy);
      expect(
        style,
        "silhouette selector missing from the stylesheet",
      ).toBeDefined();

      expect(style["background-width"]).toBe("64%");
      expect(style["background-height"]).toBe("64%");
      expect(style["background-position-y"]).toBe("44%");
    });
  });

  describe("entity type colours (issue #2680)", () => {
    const mixedGraph: Category[] = [
      { id: "character", label: "Character", color: "#60a5fa", icon: "user" },
      { id: "faction", label: "Faction", color: "#fb923c", icon: "users" },
      { id: "location", label: "Location", color: "#4ade80", icon: "map-pin" },
    ];

    const categoryStyle = (theme: (typeof THEMES)["fantasy"], id: string) =>
      getGraphStyle(theme, mixedGraph, false).find(
        (s) => s.selector === `node[type="${id}"]`,
      )?.style;

    it("paints nodes with theme-derived tones, not the raw category colour", () => {
      const location = categoryStyle(FANTASY_DARK, "location");

      expect(location["background-color"]).not.toBe("#4ade80");
      expect(location["border-color"]).not.toBe("#4ade80");
      expect(location["background-color"]).toBe(
        deriveEntityTypeTone("#4ade80", FANTASY_DARK.tokens).fill,
      );
      // Fully opaque: the tone is already blended against the theme surface,
      // so the painted colour is the one the contrast guarantees were run on.
      expect(location["background-opacity"]).toBe(1);
    });

    it("re-derives the same type for a different theme", () => {
      expect(
        categoryStyle(FANTASY_DARK, "faction")["background-color"],
      ).not.toBe(categoryStyle(THEMES.scifi, "faction")["background-color"]);
    });

    it("keeps node rings legible against the canvas in every theme", () => {
      for (const theme of Object.values(THEMES)) {
        for (const category of mixedGraph) {
          const ring = categoryStyle(theme, category.id)["border-color"];
          expect(
            contrastRatio(
              parseColor(ring)!,
              parseColor(theme.tokens.background)!,
            ),
          ).toBeGreaterThanOrEqual(MIN_GRAPHIC_CONTRAST);
        }
      }
    });

    it("falls back to the category colour when the theme cannot be parsed", () => {
      const brokenTheme = {
        ...THEMES.scifi,
        tokens: {
          ...THEMES.scifi.tokens,
          background: "var(--nope)",
          surface: "var(--nope)",
        },
      };
      const style = getGraphStyle(brokenTheme, mixedGraph, false).find(
        (s) => s.selector === 'node[type="location"]',
      )?.style;

      expect(style["background-color"]).toBe("#4ade80");
    });
  });
});
