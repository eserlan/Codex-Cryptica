import { describe, it, expect } from "vitest";
import { mergeEntities } from "../src/utils";
import { DiscoveredEntity } from "../src/types";

describe("mergeEntities bidirectional links", () => {
  it("should deduplicate bidirectional links between different entities", () => {
    const entities: DiscoveredEntity[] = [
      {
        id: "1",
        suggestedTitle: "Eldrin",
        suggestedType: "Character",
        chronicle: "",
        lore: "",
        content: "",
        frontmatter: {},
        confidence: 1,
        detectedLinks: [{ target: "Broken Tower", label: "lives in" }],
        suggestedFilename: "eldrin.md",
      },
      {
        id: "2",
        suggestedTitle: "Broken Tower",
        suggestedType: "Location",
        chronicle: "",
        lore: "",
        content: "",
        frontmatter: {},
        confidence: 1,
        detectedLinks: [{ target: "Eldrin", label: "home of" }],
        suggestedFilename: "broken-tower.md",
      },
    ];

    const merged = mergeEntities(entities);

    expect(merged).toHaveLength(2);

    const eldrin = merged.find((e) => e.suggestedTitle === "Eldrin")!;
    const tower = merged.find((e) => e.suggestedTitle === "Broken Tower")!;

    const totalLinks = eldrin.detectedLinks.length + tower.detectedLinks.length;

    // We expect only one link to remain between these two
    expect(totalLinks).toBe(1);
  });

  it("should preserve the link with a label when deduplicating bidirectional links", () => {
    const entities: DiscoveredEntity[] = [
      {
        id: "1",
        suggestedTitle: "A",
        suggestedType: "Character",
        chronicle: "",
        lore: "",
        content: "",
        frontmatter: {},
        confidence: 1,
        detectedLinks: [{ target: "B" }], // No label
        suggestedFilename: "a.md",
      },
      {
        id: "2",
        suggestedTitle: "B",
        suggestedType: "Character",
        chronicle: "",
        lore: "",
        content: "",
        frontmatter: {},
        confidence: 1,
        detectedLinks: [{ target: "A", label: "important relationship" }], // Has label
        suggestedFilename: "b.md",
      },
    ];

    const merged = mergeEntities(entities);

    const a = merged.find((e) => e.suggestedTitle === "A")!;
    const b = merged.find((e) => e.suggestedTitle === "B")!;

    // The link should have been kept on B (since it has the label) and removed from A
    expect(a.detectedLinks).toHaveLength(0);
    expect(b.detectedLinks).toHaveLength(1);
    expect((b.detectedLinks[0] as any).label).toBe("important relationship");
  });
});
