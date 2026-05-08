import { describe, it, expect, vi } from "vitest";
import { GraphTransformer, getGraphStyle } from "../src/transformer";
import { CONNECTION_COLORS } from "../src/defaults";
import type { Entity, StylingTemplate } from "schema";

describe("GraphTransformer", () => {
  it("should include dateLabel in node data", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Entity 1",
        type: "npc",
        connections: [],
        content: "Content 1",
        date: { year: 1240, month: 5, day: 12 },
      },
      {
        id: "e2",
        title: "Entity 2",
        type: "location",
        connections: [],
        content: "Content 2",
        start_date: { year: 1000, label: "Age of Myth" },
      },
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter((el) => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("1240-05-12");
    expect(nodes[1].data.dateLabel).toBe("Age of Myth");
  });

  it("should pad years to 4 digits", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Early Entity",
        type: "npc",
        connections: [],
        content: "...",
        date: { year: 1 },
      },
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter((el) => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("1");
  });

  it("should handle missing dates gracefully", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Entity 1",
        type: "npc",
        connections: [],
        content: "Content 1",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter((el) => el.group === "nodes");

    expect(nodes[0].data.dateLabel).toBe("");
  });

  it("should generate style sheet with connection type colors", () => {
    const mockTemplate: StylingTemplate = {
      description: "A dark, terminal-inspired science-fiction interface.",
      tokens: {
        background: "#000",
        primary: "#f00",
        surface: "#111",
        text: "#fff",
        fontBody: "Arial",
        fontHeading: "Arial",
      },
      graph: {
        nodeBorderWidth: 1,
        nodeShape: "ellipse",
        edgeColor: "#555",
        edgeStyle: "solid",
      },
      themeId: "dark",
    };

    const styles = getGraphStyle(mockTemplate, [], true);

    const friendlyStyle = styles.find(
      (s: any) => s.selector === 'edge[connectionType="friendly"]',
    );
    expect(friendlyStyle).toBeDefined();
    expect(friendlyStyle.style["line-color"]).toBe(CONNECTION_COLORS.friendly);

    const enemyStyle = styles.find(
      (s: any) => s.selector === 'edge[connectionType="enemy"]',
    );
    expect(enemyStyle).toBeDefined();
    expect(enemyStyle.style["line-color"]).toBe(CONNECTION_COLORS.enemy);
  });

  it("should conditionally include image selectors based on showImages", () => {
    const mockTemplate: StylingTemplate = {
      description: "A dark, terminal-inspired science-fiction interface.",
      tokens: {
        background: "#000",
        primary: "#f00",
        surface: "#111",
        text: "#fff",
        fontBody: "Arial",
        fontHeading: "Arial",
      },
      graph: {
        nodeBorderWidth: 1,
        nodeShape: "ellipse",
        edgeColor: "#555",
        edgeStyle: "solid",
      },
      themeId: "dark",
    };

    const imageSelector =
      "node[resolvedImage][resolvedImage != 'none'], node[image][resolvedImage][resolvedImage != 'none'], node[thumbnail][resolvedImage][resolvedImage != 'none']";

    // Test with images enabled (default)
    const styleWithImages = getGraphStyle(mockTemplate, [], true);
    expect(styleWithImages.some((s: any) => s.selector === imageSelector)).toBe(
      true,
    );

    // Test with images disabled
    const styleWithoutImages = getGraphStyle(mockTemplate, [], false);
    expect(
      styleWithoutImages.some((s: any) => s.selector === imageSelector),
    ).toBe(false);
  });

  it("should calculate node weight based on rendered inbound and outbound edges", () => {
    const mockEntities: Entity[] = [
      {
        id: "hub",
        title: "Hub",
        type: "npc",
        connections: [],
        content: "...",
      },
      {
        id: "e1",
        title: "Leaf 1",
        type: "npc",
        connections: [{ target: "hub", type: "friendly" }],
        content: "...",
      },
      {
        id: "e2",
        title: "Leaf 2",
        type: "npc",
        connections: [{ target: "hub", type: "enemy" }],
        content: "...",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(mockEntities);
    const nodes = elements.filter((el) => el.group === "nodes");

    const hubNode = nodes.find((n) => n.data.id === "hub");
    const leafNode = nodes.find((n) => n.data.id === "e2");

    expect(hubNode?.data.weight).toBe(2);
    expect(leafNode?.data.weight).toBe(1);
  });

  it("should ignore hidden or invalid targets when calculating node weight", () => {
    const mockEntities: Entity[] = [
      {
        id: "e1",
        title: "Visible Hub",
        type: "npc",
        connections: [
          { target: "e2", type: "friendly" },
          { target: "hidden", type: "ally" },
          { target: "missing", type: "enemy" },
        ],
        content: "...",
      },
      {
        id: "e2",
        title: "Visible Leaf",
        type: "npc",
        connections: [],
        content: "...",
      },
      {
        id: "hidden",
        title: "Hidden Leaf",
        type: "npc",
        connections: [],
        content: "...",
      },
    ];

    const elements = GraphTransformer.entitiesToElements(
      mockEntities,
      new Set(["e1", "e2"]),
    );
    const nodes = elements.filter((el) => el.group === "nodes");
    const edges = elements.filter((el) => el.group === "edges");

    const visibleHub = nodes.find((n) => n.data.id === "e1");
    const visibleLeaf = nodes.find((n) => n.data.id === "e2");
    const hiddenLeaf = nodes.find((n) => n.data.id === "hidden");

    expect(visibleHub?.data.weight).toBe(1);
    expect(visibleLeaf?.data.weight).toBe(1);
    expect(hiddenLeaf?.data.weight).toBe(0);
    expect(edges).toHaveLength(1);
  });

  it("should generate tier-based node sizes", () => {
    const mockTemplate: StylingTemplate = {
      description: "...",
      tokens: {
        background: "#000",
        primary: "#f00",
        surface: "#111",
        text: "#fff",
        fontBody: "Arial",
        fontHeading: "Arial",
      },
      graph: {
        nodeBorderWidth: 1,
        nodeShape: "ellipse",
        edgeColor: "#555",
        edgeStyle: "solid",
      },
      themeId: "dark",
    };

    const styles = getGraphStyle(mockTemplate, [], false);

    // Tier 0: 0-2 connections -> 40px
    const tier0 = styles.find((s: any) => s.selector === "node[weight <= 2]");
    expect(tier0?.style.width).toBe(40);

    // Tier 1: 3-11 connections -> 60px
    const tier1 = styles.find(
      (s: any) => s.selector === "node[weight >= 3][weight <= 11]",
    );
    expect(tier1?.style.width).toBe(60);

    // Tier 2: 12+ connections -> 96px (Capped)
    const tier2 = styles.find((s: any) => s.selector === "node[weight >= 12]");
    expect(tier2?.style.width).toBe(96);

    // Verify transitions
    const baseNodeStyle = styles.find((s: any) => s.selector === "node");
    expect(baseNodeStyle?.style["transition-property"]).toContain("width");
    expect(baseNodeStyle?.style["transition-property"]).toContain("height");
  });

  it("should apply the fantasy shield shape to base graph nodes", () => {
    const mockTemplate: StylingTemplate = {
      id: "fantasy",
      name: "Ancient Parchment",
      description: "...",
      tokens: {
        background: "#fdf6e3",
        primary: "#5e3018",
        secondary: "#423830",
        surface: "#f0ddb8",
        text: "#2a2018",
        border: "rgba(94, 48, 24, 0.52)",
        accent: "#c8973a",
        fontHeader: "'Alegreya', serif",
        fontBody: "'Alegreya', serif",
        texture: "parchment.svg",
      },
      graph: {
        nodeBorderWidth: 2,
        nodeShape: "ellipse",
        edgeColor: "#6b3820",
        edgeStyle: "solid",
        edgeWidth: 3,
      },
    };

    const styles = getGraphStyle(mockTemplate, [], false);
    const baseNodeStyle = styles.find((s: any) => s.selector === "node");

    expect(baseNodeStyle?.style.shape).toBe("polygon");
    expect(baseNodeStyle?.style["background-image"]).toBe(
      "url('/themes/parchment.svg')",
    );
    expect(baseNodeStyle?.style["background-fit"]).toBe("cover");
    expect(baseNodeStyle?.style["background-clip"]).toBe("node");
    expect(baseNodeStyle?.style["background-image-crossorigin"]).toBe("null");
    expect(baseNodeStyle?.style["background-repeat"]).toBe("no-repeat");
  });

  it("should not set a node texture when the theme has no texture", () => {
    const mockTemplate: StylingTemplate = {
      id: "scifi",
      name: "Sci-Fi Terminal",
      description: "...",
      tokens: {
        background: "#000",
        primary: "#f00",
        secondary: "#0f0",
        surface: "#111",
        text: "#fff",
        border: "#333",
        accent: "#00f",
        fontHeader: "Arial",
        fontBody: "Arial",
      },
      graph: {
        nodeBorderWidth: 1,
        nodeShape: "ellipse",
        edgeColor: "#555",
        edgeStyle: "solid",
        edgeWidth: 1,
      },
    };

    const styles = getGraphStyle(mockTemplate, [], false);
    const baseNodeStyle = styles.find((s: any) => s.selector === "node");

    expect(baseNodeStyle?.style["background-image"]).toBeUndefined();
  });

  it("should include a random texture variant for graph nodes", () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.33)
      .mockReturnValueOnce(0.66)
      .mockReturnValueOnce(0.99);
    const mockEntities: Entity[] = [
      {
        id: "node-alpha",
        title: "Alpha",
        type: "npc",
        connections: [],
        content: "...",
      },
      {
        id: "node-beta",
        title: "Beta",
        type: "npc",
        connections: [],
        content: "...",
      },
      {
        id: "node-gamma",
        title: "Gamma",
        type: "npc",
        connections: [],
        content: "...",
      },
      {
        id: "node-delta",
        title: "Delta",
        type: "npc",
        connections: [],
        content: "...",
      },
    ];

    const nodes = GraphTransformer.entitiesToElements(mockEntities).filter(
      (el) => el.group === "nodes",
    );

    expect(nodes.map((node) => node.data.textureVariant)).toEqual([0, 1, 2, 3]);
    randomSpy.mockRestore();
  });
});
