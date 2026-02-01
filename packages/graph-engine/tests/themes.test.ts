import { describe, it, expect } from "vitest";
import { getGraphStyle } from "../src/transformer"; // Corrected import path for transformer functions
import { THEMES } from "schema";
import type { Category } from "schema";

describe("Graph Theme Generation", () => {
  const mockCategories: Category[] = [
    { id: "npc", label: "NPC", color: "#60a5fa", icon: "user" }
  ];

  it("should generate same node shapes for all themes (standardized)", () => {
    const scifiStyle = getGraphStyle(THEMES.scifi, mockCategories);
    const fantasyStyle = getGraphStyle(THEMES.fantasy, mockCategories);
    const cyberpunkStyle = getGraphStyle(THEMES.cyberpunk, mockCategories);

    const scifiNode = scifiStyle.find(s => s.selector === "node")?.style;
    const fantasyNode = fantasyStyle.find(s => s.selector === "node")?.style;
    const cyberpunkNode = cyberpunkStyle.find(s => s.selector === "node")?.style;

    expect(scifiNode.shape).toBe("round-rectangle");
    expect(fantasyNode.shape).toBe("round-rectangle");
    expect(cyberpunkNode.shape).toBe("round-rectangle");
  });

  it("should generate different edge styles", () => {
    const scifiStyle = getGraphStyle(THEMES.scifi, mockCategories);
    const cyberpunkStyle = getGraphStyle(THEMES.cyberpunk, mockCategories);

    const scifiEdge = scifiStyle.find(s => s.selector === "edge")?.style;
    const cyberpunkEdge = cyberpunkStyle.find(s => s.selector === "edge")?.style;

    expect(scifiEdge["line-style"]).toBe("solid");
    expect(cyberpunkEdge["line-style"]).toBe("dashed");
  });
});
