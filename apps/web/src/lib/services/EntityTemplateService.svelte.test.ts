import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntityTemplateService } from "./EntityTemplateService.svelte";
import {
  GENERIC_TEMPLATES,
  FANTASY_TEMPLATES,
  SCIFI_TEMPLATES,
  MODERN_TEMPLATES,
  CYBERPUNK_TEMPLATES,
  APOCALYPTIC_TEMPLATES,
  HORROR_TEMPLATES,
  FALLOUT_TEMPLATES,
  STARWARS_TEMPLATES,
  STARTREK_TEMPLATES,
} from "./EntityTemplateConstants";

describe("EntityTemplateService", () => {
  let service: EntityTemplateService;
  let mockThemeStore: { worldThemeId: string };

  beforeEach(() => {
    mockThemeStore = { worldThemeId: "workspace" };
    service = new EntityTemplateService({ themeStore: mockThemeStore });
  });

  // --- User Story 1 & 2: Generic defaults and blank values ---
  describe("Generic System Defaults (US1 & US2)", () => {
    it("should return the correct generic template for character", async () => {
      const result = await service.resolveTemplate("character");
      expect(result).toBe(GENERIC_TEMPLATES.character);
    });

    it("should return the correct generic template for faction", async () => {
      const result = await service.resolveTemplate("faction");
      expect(result).toBe(GENERIC_TEMPLATES.faction);
    });

    it("should return the correct generic template for location", async () => {
      const result = await service.resolveTemplate("location");
      expect(result).toBe(GENERIC_TEMPLATES.location);
    });

    it("should return the correct generic template for item", async () => {
      const result = await service.resolveTemplate("item");
      expect(result).toBe(GENERIC_TEMPLATES.item);
    });

    it("should return the correct generic template for event", async () => {
      const result = await service.resolveTemplate("event");
      expect(result).toBe(GENERIC_TEMPLATES.event);
    });

    it("should return the correct generic template for creature", async () => {
      const result = await service.resolveTemplate("creature");
      expect(result).toBe(GENERIC_TEMPLATES.creature);
    });

    it("should return the correct generic template for note", async () => {
      const result = await service.resolveTemplate("note");
      expect(result).toBe(GENERIC_TEMPLATES.note);
    });

    it("should be case-insensitive for entity type resolution", async () => {
      const resultLower = await service.resolveTemplate("character");
      const resultUpper = await service.resolveTemplate("CHARACTER");
      const resultMixed = await service.resolveTemplate("cHaRaCtEr");
      expect(resultLower).toBe(GENERIC_TEMPLATES.character);
      expect(resultUpper).toBe(GENERIC_TEMPLATES.character);
      expect(resultMixed).toBe(GENERIC_TEMPLATES.character);
    });

    it("should return an empty string for unknown entity types", async () => {
      const result = await service.resolveTemplate("unknown_type");
      expect(result).toBe("");
    });

    it("should return an empty string for empty string type", async () => {
      const result = await service.resolveTemplate("");
      expect(result).toBe("");
    });
  });

  // --- User Story 4: Theme-Specific Default Fallbacks ---
  describe("Theme-Specific Defaults (US4)", () => {
    it("should return fantasy character template when theme is fantasy", async () => {
      const result = await service.resolveTemplate("character", "fantasy");
      expect(result).toBe(FANTASY_TEMPLATES.character);
    });

    it("should fall back to worldThemeId from themeStore if no themeId is explicitly passed", async () => {
      mockThemeStore.worldThemeId = "fantasy";
      const result = await service.resolveTemplate("character");
      expect(result).toBe(FANTASY_TEMPLATES.character);
    });

    it("should return sci-fi character template when theme is scifi", async () => {
      const result = await service.resolveTemplate("character", "scifi");
      expect(result).toBe(SCIFI_TEMPLATES.character);
    });

    it("should return horror character template when theme is horror", async () => {
      const result = await service.resolveTemplate("character", "horror");
      expect(result).toBe(HORROR_TEMPLATES.character);
    });

    it("should return horror character template when theme has light/dark suffix (horror_light)", async () => {
      const result = await service.resolveTemplate("character", "horror_light");
      expect(result).toBe(HORROR_TEMPLATES.character);
    });

    it("should return fallout character template when theme is fallout", async () => {
      const result = await service.resolveTemplate("character", "fallout");
      expect(result).toBe(FALLOUT_TEMPLATES.character);
    });

    it("should return fallout character template when theme has light/dark suffix (fallout_light)", async () => {
      const result = await service.resolveTemplate(
        "character",
        "fallout_light",
      );
      expect(result).toBe(FALLOUT_TEMPLATES.character);
    });

    it("should return theme-specific template for non-character types when available (e.g., fantasy location)", async () => {
      const result = await service.resolveTemplate("location", "fantasy");
      expect(result).toBe(FANTASY_TEMPLATES.location);
    });

    it("should return cyberpunk-specific templates correctly", async () => {
      const resultChar = await service.resolveTemplate(
        "character",
        "cyberpunk",
      );
      const resultItem = await service.resolveTemplate("item", "cyberpunk");
      expect(resultChar).toBe(CYBERPUNK_TEMPLATES.character);
      expect(resultItem).toBe(CYBERPUNK_TEMPLATES.item);
    });

    it("should return star wars-specific templates correctly", async () => {
      const resultChar = await service.resolveTemplate("character", "starwars");
      const resultFaction = await service.resolveTemplate(
        "faction",
        "starwars",
      );
      expect(resultChar).toBe(STARWARS_TEMPLATES.character);
      expect(resultFaction).toBe(STARWARS_TEMPLATES.faction);
    });

    it("should return star trek-specific templates correctly", async () => {
      const resultChar = await service.resolveTemplate("character", "startrek");
      const resultCreature = await service.resolveTemplate(
        "creature",
        "startrek",
      );
      expect(resultChar).toBe(STARTREK_TEMPLATES.character);
      expect(resultCreature).toBe(STARTREK_TEMPLATES.creature);
    });

    it("should return modern-specific templates correctly", async () => {
      const resultChar = await service.resolveTemplate("character", "modern");
      const resultLocation = await service.resolveTemplate(
        "location",
        "modern",
      );
      expect(resultChar).toBe(MODERN_TEMPLATES.character);
      expect(resultLocation).toBe(MODERN_TEMPLATES.location);
    });

    it("should return apocalyptic-specific templates correctly", async () => {
      const resultChar = await service.resolveTemplate(
        "character",
        "apocalyptic",
      );
      const resultFaction = await service.resolveTemplate(
        "faction",
        "apocalyptic",
      );
      expect(resultChar).toBe(APOCALYPTIC_TEMPLATES.character);
      expect(resultFaction).toBe(APOCALYPTIC_TEMPLATES.faction);
    });

    it("should fall back to generic template if theme is unsupported/unknown", async () => {
      const result = await service.resolveTemplate(
        "character",
        "unknown_theme",
      );
      expect(result).toBe(GENERIC_TEMPLATES.character);
    });
  });

  // --- User Story 3: Vault-Level Custom Templates ---
  describe("Vault-Level Custom Templates (US3)", () => {
    let mockFileHandle: any;
    let mockTemplatesDirHandle: any;
    let mockCcDirHandle: any;
    let mockCodexDirHandle: any;
    let mockVaultDirHandle: any;

    beforeEach(() => {
      mockFileHandle = {
        kind: "file",
        name: "character.md",
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue("custom character file content"),
        }),
      };

      mockTemplatesDirHandle = {
        kind: "directory",
        name: "templates",
        entries: vi.fn().mockImplementation(async function* () {
          yield ["character.md", mockFileHandle];
        }),
      };

      mockCcDirHandle = {
        kind: "directory",
        name: ".cc",
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "templates")
            return Promise.resolve(mockTemplatesDirHandle);
          return Promise.reject(new Error("Not found"));
        }),
      };

      mockCodexDirHandle = {
        kind: "directory",
        name: ".codex",
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === "templates")
            return Promise.resolve(mockTemplatesDirHandle);
          return Promise.reject(new Error("Not found"));
        }),
      };

      mockVaultDirHandle = {
        kind: "directory",
        name: "vault-root",
        getDirectoryHandle: vi.fn().mockImplementation((name) => {
          if (name === ".cc") return Promise.resolve(mockCcDirHandle);
          if (name === ".codex") return Promise.resolve(mockCodexDirHandle);
          return Promise.reject(new Error("Not found"));
        }),
      };
    });

    it("should load custom template from .cc/templates/ first", async () => {
      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe("custom character file content");
      expect(mockVaultDirHandle.getDirectoryHandle).toHaveBeenCalledWith(".cc");
      expect(mockCcDirHandle.getDirectoryHandle).toHaveBeenCalledWith(
        "templates",
      );
    });

    it("should fall back to .codex/templates/ if .cc/templates/ is missing", async () => {
      mockVaultDirHandle.getDirectoryHandle.mockImplementation(
        (name: string) => {
          if (name === ".cc") return Promise.reject(new Error("Not found"));
          if (name === ".codex") return Promise.resolve(mockCodexDirHandle);
          return Promise.reject(new Error("Not found"));
        },
      );

      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe("custom character file content");
      expect(mockVaultDirHandle.getDirectoryHandle).toHaveBeenCalledWith(".cc");
      expect(mockVaultDirHandle.getDirectoryHandle).toHaveBeenCalledWith(
        ".codex",
      );
      expect(mockCodexDirHandle.getDirectoryHandle).toHaveBeenCalledWith(
        "templates",
      );
    });

    it("should be case-insensitive when matching custom template filenames", async () => {
      mockFileHandle.name = "Character.MD"; // mixed case filename on disk
      mockTemplatesDirHandle.entries = vi
        .fn()
        .mockImplementation(async function* () {
          yield ["Character.MD", mockFileHandle];
        });

      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe("custom character file content");
    });

    it("should return empty string if the custom template file is empty, preventing fallback", async () => {
      mockFileHandle.getFile = vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(""),
      });

      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe("");
    });

    it("should gracefully fall back to default template if the custom template folder is missing", async () => {
      mockVaultDirHandle.getDirectoryHandle.mockRejectedValue(
        new Error("Not found"),
      );

      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe(GENERIC_TEMPLATES.character);
    });

    it("should gracefully fall back to default template if reading custom file fails", async () => {
      mockFileHandle.getFile = vi
        .fn()
        .mockRejectedValue(new Error("Read failed"));

      const result = await service.resolveTemplate(
        "character",
        "workspace",
        mockVaultDirHandle,
      );
      expect(result).toBe(GENERIC_TEMPLATES.character);
    });
  });

  // --- extractSummary Tests ---
  describe("Summary Extraction (extractSummary)", () => {
    it("should extract correct summary under ## Summary header", () => {
      const template =
        "## Summary\nThis is the short form summary.\n\n## Appearance\nDetailed desc";
      expect(service.extractSummary(template)).toBe(
        "This is the short form summary.",
      );
    });

    it("should ignore empty lines between header and text", () => {
      const template =
        "## Summary\n\n\n  This is the short form summary with whitespace.  \n\n## Appearance";
      expect(service.extractSummary(template)).toBe(
        "This is the short form summary with whitespace.",
      );
    });

    it("should return empty string if ## Summary has no text content before next header", () => {
      const template = "## Summary\n## Appearance\nDetailed desc";
      expect(service.extractSummary(template)).toBe("");
    });

    it("should work with Windows-style line endings", () => {
      const template =
        "## Summary\r\nThis is windows newline summary.\r\n\r\n## Appearance";
      expect(service.extractSummary(template)).toBe(
        "This is windows newline summary.",
      );
    });

    it("should return empty string if there is no Summary header", () => {
      const template = "## Introduction\nSome text\n## Appearance";
      expect(service.extractSummary(template)).toBe("");
    });

    it("should return empty string for empty template", () => {
      expect(service.extractSummary("")).toBe("");
    });
  });
});
