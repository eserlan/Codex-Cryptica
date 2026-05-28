import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntityTemplateService } from "./EntityTemplateService.svelte";
import {
  GENERIC_TEMPLATES,
  FANTASY_TEMPLATES,
  SCIFI_TEMPLATES,
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

    it("should fall back to generic template for non-character types even if fantasy theme is selected", async () => {
      const result = await service.resolveTemplate("location", "fantasy");
      expect(result).toBe(GENERIC_TEMPLATES.location);
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
});
