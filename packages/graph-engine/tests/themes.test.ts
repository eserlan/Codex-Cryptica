import { describe, it, expect } from "vitest";
import { getGraphStyle } from "../src/transformer";
import { THEMES } from "schema";
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
});
