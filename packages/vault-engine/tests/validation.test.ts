import { describe, it, expect, vi } from "vitest";
import { VaultRepository } from "../src/repository.svelte";
import type { IFileIOAdapter } from "../src/repository.svelte";
import type { LocalEntity, FileEntry } from "../src/types";
import { validateMarkdownFrontmatter } from "../src/parser";

describe("Vault Data Validation", () => {
  it("should quarantine corrupted cached records and fall back to disk", async () => {
    const mockFileHandle = {
      getFile: async () => ({ lastModified: 1000 }) as unknown as File,
    } as unknown as FileSystemFileHandle;

    const mockFileEntry: FileEntry = {
      handle: mockFileHandle,
      path: ["test.md"],
    };

    const mockVaultHandle = {} as FileSystemDirectoryHandle;

    const mockValidEntity: LocalEntity = {
      id: "valid-1",
      type: "note",
      title: "Valid Note",
      tags: [],
      labels: [],
      aliases: [],
      connections: [],
      content: "Valid content",
    };

    const ioAdapter: IFileIOAdapter = {
      walkDirectory: async () => [mockFileEntry],
      readFileAsText: async () => "valid content from disk",
      parseMarkdown: () => mockValidEntity,
      getCachedEntity: async () => ({
        lastModified: 1000,
        // Corrupted entity: missing required fields like title and type
        entity: { id: "corrupt-1" } as unknown as LocalEntity,
      }),
      writeEntityFile: async () => {},
      setCachedEntity: async () => {},
      isNotFoundError: () => false,
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const repo = new VaultRepository(ioAdapter);
    const entities = await repo.loadFiles("test-vault", mockVaultHandle);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[VaultRepository] Quarantined corrupted cached entity at test.md",
      ),
      expect.any(Object), // the Zod error
    );

    // Should have parsed from disk and returned the valid entity
    expect(entities["valid-1"]).toBeDefined();
    expect(entities["valid-1"].title).toBe("Valid Note");

    warnSpy.mockRestore();
  });

  it("should reject invalid YAML frontmatter", () => {
    const validMarkdown = `---
id: "test-note"
type: "note"
title: "Test"
labels: []
aliases: []
connections: []
content: ""
---
Content
`;
    expect(validateMarkdownFrontmatter(validMarkdown).success).toBe(true);

    const invalidMarkdown = `---
type: 123
title: ["Not a string"]
---
Content
`;
    expect(validateMarkdownFrontmatter(invalidMarkdown).success).toBe(false);

    const malformedYaml = `---
type: "note"
  title: "Test"
---
Content
`;
    expect(validateMarkdownFrontmatter(malformedYaml).success).toBe(false);

    const unsupportedTags = `---
type: "note"
title: "Test"
tags: ["legacy"]
---
Content
`;
    expect(validateMarkdownFrontmatter(unsupportedTags).success).toBe(false);
  });
});
