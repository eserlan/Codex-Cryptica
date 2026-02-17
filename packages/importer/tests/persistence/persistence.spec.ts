import { describe, it, expect } from "vitest";
import {
  generateMarkdownFile,
  getRegistry,
  markChunkComplete,
} from "../../src/persistence";
import { DiscoveredEntity } from "../../src/types";
import "fake-indexeddb/auto";

describe("Persistence", () => {
  it("generates valid markdown with frontmatter", () => {
    const entity: DiscoveredEntity = {
      id: "1",
      suggestedTitle: "Hero",
      suggestedType: "Character",
      content: "A brave warrior.",
      frontmatter: { class: "Warrior", level: 5 },
      confidence: 1,
      detectedLinks: [],
      chronicle: "Hero summary",
      lore: "Hero lore",
      suggestedFilename: "hero.md",
    };

    const fileContent = generateMarkdownFile(entity);

    expect(fileContent).toContain("---");
    expect(fileContent).toContain("title: Hero");
    expect(fileContent).toContain("type: Character");
    expect(fileContent).toContain("class: Warrior");
    expect(fileContent).toContain("level: 5");
    expect(fileContent).toContain("A brave warrior.");
  });

  describe("ImportRegistry", () => {
    const testHash = "test-hash";
    const testFile = "test.docx";

    it("creates a new registry record if none exists", async () => {
      const record = await getRegistry(testHash, testFile, 5);
      expect(record.hash).toBe(testHash);
      expect(record.totalChunks).toBe(5);
      expect(record.completedIndices).toEqual([]);
    });

    it("marks chunks as complete and persists state", async () => {
      await getRegistry(testHash, testFile, 5);
      await markChunkComplete(testHash, 0);
      await markChunkComplete(testHash, 2);

      const record = await getRegistry(testHash, testFile, 5);
      expect(record.completedIndices).toContain(0);
      expect(record.completedIndices).toContain(2);
      expect(record.completedIndices).not.toContain(1);
    });
  });
});
