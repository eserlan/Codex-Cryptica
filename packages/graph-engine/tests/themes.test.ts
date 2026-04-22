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
    expect(fantasyNode.shape).toBe("ellipse");
    expect(cyberpunkNode.shape).toBe("ellipse");
  });

  it("should generate different edge styles", () => {
    const scifiStyle = getGraphStyle(THEMES.scifi, mockCategories, false);
    const cyberpunkStyle = getGraphStyle(
      THEMES.cyberpunk,
      mockCategories,
      false,
    );

    const scifiEdge = scifiStyle.find((s) => s.selector === "edge")?.style;
    const cyberpunkEdge = cyberpunkStyle.find(
      (s) => s.selector === "edge",
    )?.style;

    expect(scifiEdge["line-style"]).toBe("solid");
    expect(cyberpunkEdge["line-style"]).toBe("dashed");
  });
});
