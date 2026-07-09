import { describe, expect, it } from "vitest";
import { discoveredEntitiesToPackage } from "./oracle-discovery";
import type { DiscoveredEntity } from "../types";

function makeEntity(overrides: Partial<DiscoveredEntity>): DiscoveredEntity {
  return {
    id: "id-" + Math.random().toString(36).slice(2),
    suggestedTitle: "Untitled",
    suggestedType: "Character",
    chronicle: "",
    lore: "",
    content: "",
    frontmatter: {},
    confidence: 1,
    suggestedFilename: "untitled.md",
    detectedLinks: [],
    ...overrides,
  };
}

describe("discoveredEntitiesToPackage", () => {
  it("maps basic fields into entity drafts", () => {
    const hero = makeEntity({
      id: "hero-1",
      suggestedTitle: "Hero",
      suggestedType: "Character",
      chronicle: "A brave warrior.",
      lore: "Detailed history.",
      frontmatter: { image: "https://example.com/hero.png", race: "Human" },
    });

    const pkg = discoveredEntitiesToPackage([hero], "Oracle Analysis");

    expect(pkg.sourceSystem).toBe("oracle");
    expect(pkg.sourceLabel).toBe("Oracle Analysis");
    expect(pkg.entityDrafts).toHaveLength(1);

    const draft = pkg.entityDrafts[0];
    expect(draft.sourceId).toBe("hero-1");
    expect(draft.sourceType).toBe("Character");
    expect(draft.title).toBe("Hero");
    expect(draft.content).toBe("A brave warrior.");
    expect(draft.lore).toBe("Detailed history.");
    expect(draft.image).toBe("https://example.com/hero.png");
    expect(draft.metadata).toEqual({ race: "Human" });
  });

  it("resolves detectedLinks to sibling entities within the same batch", () => {
    const hero = makeEntity({
      id: "hero-1",
      suggestedTitle: "Hero",
      detectedLinks: [{ target: "Sword", label: "wields" }],
    });
    const sword = makeEntity({
      id: "sword-1",
      suggestedTitle: "Sword",
      suggestedType: "Item",
    });

    const pkg = discoveredEntitiesToPackage([hero, sword], "Oracle Analysis");

    expect(pkg.relationshipDrafts).toEqual([
      {
        fromRef: "hero-1",
        toRef: "sword-1",
        type: "related_to",
        label: "wields",
      },
    ]);
  });

  it("drops links to entities not present in the batch, and self-links", () => {
    const hero = makeEntity({
      id: "hero-1",
      suggestedTitle: "Hero",
      detectedLinks: [
        { target: "Nonexistent Nemesis" },
        { target: "Hero" }, // self-link
      ],
    });

    const pkg = discoveredEntitiesToPackage([hero], "Oracle Analysis");

    expect(pkg.relationshipDrafts).toEqual([]);
  });

  it("skips relationship resolution for titles shared by more than one entity", () => {
    const narrator = makeEntity({
      id: "narrator-1",
      suggestedTitle: "Narrator",
      detectedLinks: [{ target: "Sarah" }],
    });
    const sarahOne = makeEntity({ id: "sarah-1", suggestedTitle: "Sarah" });
    const sarahTwo = makeEntity({ id: "sarah-2", suggestedTitle: "sarah " }); // same key after normalization

    const pkg = discoveredEntitiesToPackage(
      [narrator, sarahOne, sarahTwo],
      "Oracle Analysis",
    );

    expect(pkg.relationshipDrafts).toEqual([]);
  });

  it("accepts plain string detectedLinks", () => {
    const hero = makeEntity({
      id: "hero-1",
      suggestedTitle: "Hero",
      detectedLinks: ["Sword"],
    });
    const sword = makeEntity({ id: "sword-1", suggestedTitle: "Sword" });

    const pkg = discoveredEntitiesToPackage([hero, sword], "Oracle Analysis");

    expect(pkg.relationshipDrafts).toEqual([
      {
        fromRef: "hero-1",
        toRef: "sword-1",
        type: "related_to",
        label: undefined,
      },
    ]);
  });

  it("omits image/thumbnail/labels/width/height from metadata since they're promoted to draft fields", () => {
    const entity = makeEntity({
      frontmatter: {
        image: "https://example.com/a.png",
        thumbnail: "https://example.com/a-thumb.png",
        labels: ["tag1", "tag2"],
        width: 100,
        height: 200,
        alignment: "Lawful Good",
      },
    });

    const pkg = discoveredEntitiesToPackage([entity], "Oracle Analysis");
    const draft = pkg.entityDrafts[0];

    expect(draft.image).toBe("https://example.com/a.png");
    expect(draft.thumbnail).toBe("https://example.com/a-thumb.png");
    expect(draft.labels).toEqual(["tag1", "tag2"]);
    expect(draft.metadata).toEqual({
      width: 100,
      height: 200,
      alignment: "Lawful Good",
    });
  });
});
