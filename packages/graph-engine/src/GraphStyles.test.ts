import { describe, it, expect } from "vitest";
import { getGraphStyles } from "./GraphStyles";
import type { StylingTemplate, Category } from "schema";

describe("getGraphStyles", () => {
  const mockTemplate = {
    tokens: {
      primary: "#ff0000",
      secondary: "#00ff00",
      accent: "#0000ff",
      background: "#000000",
      surface: "#111111",
      border: "#222222",
      text: "#ffffff",
      muted: "#888888",
      fontHeader: "sans-serif",
    },
    graph: {
      nodeShape: "ellipse",
      nodeBorderWidth: 2,
    },
  } as unknown as StylingTemplate;

  const mockCategories: Category[] = [];

  it("should return a style array", () => {
    const styles = getGraphStyles(
      mockTemplate,
      mockCategories,
      true,
      false,
      true,
    );
    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBeGreaterThan(0);
  });

  it("should include filtering styles", () => {
    const styles = getGraphStyles(
      mockTemplate,
      mockCategories,
      true,
      false,
      true,
    );
    const selectors = styles.map((s) => s.selector);
    expect(selectors).toContain(".filtered-out");
    expect(selectors).toContain(".timeline-hidden");
    expect(selectors).toContain(".category-filtered-out");
  });

  it("should hide labels in timeline mode", () => {
    const styles = getGraphStyles(
      mockTemplate,
      mockCategories,
      true,
      true,
      true,
    );
    const nodeLabelStyle = styles.find(
      (s) => s.selector === "node" && s.style.label === "",
    );
    expect(nodeLabelStyle).toBeDefined();
  });
});
