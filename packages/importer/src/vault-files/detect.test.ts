import { describe, it, expect } from "vitest";
import { isVaultEntityFile, parseVaultFileFrontmatter } from "./detect";

function entityFile(overrides: Record<string, string> = {}): string {
  const type = overrides.type ?? "Character";
  const title = overrides.title ?? "Thistle";
  return `---\nid: thistle\ntype: ${type}\ntitle: ${title}\nlabels: []\n---\n\nSome lore.`;
}

describe("isVaultEntityFile", () => {
  it("recognizes a real entity markdown file", () => {
    expect(isVaultEntityFile("entities/thistle.md", entityFile())).toBe(true);
  });

  it("recognizes .markdown extension too", () => {
    expect(isVaultEntityFile("entities/thistle.markdown", entityFile())).toBe(
      true,
    );
  });

  it("rejects non-markdown files", () => {
    expect(isVaultEntityFile("images/thistle.png", entityFile())).toBe(false);
  });

  it("rejects markdown files with no frontmatter", () => {
    expect(isVaultEntityFile("notes/readme.md", "# Just a heading")).toBe(
      false,
    );
  });

  it("rejects frontmatter missing type", () => {
    const raw = `---\ntitle: Thistle\n---\nBody`;
    expect(isVaultEntityFile("entities/thistle.md", raw)).toBe(false);
  });

  it("rejects frontmatter missing title", () => {
    const raw = `---\ntype: Character\n---\nBody`;
    expect(isVaultEntityFile("entities/thistle.md", raw)).toBe(false);
  });

  it("rejects frontmatter with blank type/title", () => {
    const raw = `---\ntype: "  "\ntitle: "  "\n---\nBody`;
    expect(isVaultEntityFile("entities/thistle.md", raw)).toBe(false);
  });

  it("rejects malformed YAML frontmatter without throwing", () => {
    const raw = `---\ntype: [unterminated\n---\nBody`;
    expect(isVaultEntityFile("entities/thistle.md", raw)).toBe(false);
  });

  it("rejects frontmatter that parses to an array", () => {
    const raw = `---\n- a\n- b\n---\nBody`;
    expect(isVaultEntityFile("entities/thistle.md", raw)).toBe(false);
  });

  it("accepts a custom (non-built-in) entity type", () => {
    expect(
      isVaultEntityFile(
        "entities/relic.md",
        entityFile({ type: "Ancient Relic", title: "The Shard" }),
      ),
    ).toBe(true);
  });
});

describe("parseVaultFileFrontmatter", () => {
  it("splits metadata and body", () => {
    const { metadata, content } = parseVaultFileFrontmatter(entityFile());
    expect(metadata.type).toBe("Character");
    expect(metadata.title).toBe("Thistle");
    expect(content).toBe("Some lore.");
  });

  it("returns empty metadata and the raw content when no frontmatter is present", () => {
    const { metadata, content } = parseVaultFileFrontmatter("Just text");
    expect(metadata).toEqual({});
    expect(content).toBe("Just text");
  });
});
