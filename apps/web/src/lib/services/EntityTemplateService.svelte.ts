import {
  GENERIC_TEMPLATES,
  FANTASY_TEMPLATES,
  SCIFI_TEMPLATES,
} from "./EntityTemplateConstants";

export interface EntityTemplateServiceDeps {
  themeStore?: {
    worldThemeId: string;
  };
}

export class EntityTemplateService {
  private deps: EntityTemplateServiceDeps;

  constructor(deps: EntityTemplateServiceDeps = {}) {
    this.deps = deps;
  }

  /**
   * Resolves the markdown template to pre-populate an entity with.
   *
   * @param type - The entity type (e.g., 'character', 'location')
   * @param themeId - Optional override active theme ID (falls back to worldThemeId)
   * @param customTemplatesDirHandle - FileSystemDirectoryHandle pointing to the local vault/root folder
   * @returns The resolved template content as a string
   */
  async resolveTemplate(
    type: string,
    themeId?: string,
    customTemplatesDirHandle?: FileSystemDirectoryHandle | null,
  ): Promise<string> {
    const normalizedType = type.toLowerCase();

    // Resolve active theme ID
    const activeThemeId = (
      themeId ||
      this.deps.themeStore?.worldThemeId ||
      "workspace"
    ).toLowerCase();

    // 1. Check local file overrides if a directory handle is provided
    if (customTemplatesDirHandle) {
      let templatesHandle: FileSystemDirectoryHandle | undefined;

      // Try checking .cc/templates first
      try {
        const ccHandle =
          await customTemplatesDirHandle.getDirectoryHandle(".cc");
        templatesHandle = await ccHandle.getDirectoryHandle("templates");
      } catch {
        // Ignored, fallback to checking .codex
      }

      // Try checking .codex/templates second if .cc/templates was not found
      if (!templatesHandle) {
        try {
          const codexHandle =
            await customTemplatesDirHandle.getDirectoryHandle(".codex");
          templatesHandle = await codexHandle.getDirectoryHandle("templates");
        } catch {
          // Ignored
        }
      }

      // If we found a templates directory, search for {type}.md case-insensitively
      if (templatesHandle) {
        let targetFileHandle: FileSystemFileHandle | undefined;
        try {
          const lowercaseTarget = `${normalizedType}.md`;
          for await (const [name, handle] of templatesHandle.entries()) {
            if (
              handle.kind === "file" &&
              name.toLowerCase() === lowercaseTarget
            ) {
              targetFileHandle = handle as FileSystemFileHandle;
              break;
            }
          }
        } catch {
          // Ignored, will fall back to system defaults
        }

        // If a file handle was found, read its content. If it fails, fallback to default.
        if (targetFileHandle) {
          try {
            const file = await targetFileHandle.getFile();
            return await file.text();
          } catch {
            // Ignored, will fall back to system defaults
          }
        }
      }
    }

    // 2. Fallback to theme-specific system default templates
    if (
      activeThemeId === "fantasy" &&
      FANTASY_TEMPLATES[normalizedType] !== undefined
    ) {
      return FANTASY_TEMPLATES[normalizedType];
    }
    if (
      activeThemeId === "scifi" &&
      SCIFI_TEMPLATES[normalizedType] !== undefined
    ) {
      return SCIFI_TEMPLATES[normalizedType];
    }

    // 3. Fallback to standard generic templates
    if (GENERIC_TEMPLATES[normalizedType] !== undefined) {
      return GENERIC_TEMPLATES[normalizedType];
    }

    return "";
  }

  /**
   * Extracts the summary line under the '## Summary' header from a template.
   */
  extractSummary(templateText: string): string {
    if (!templateText) return "";
    const lines = templateText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^##?\s+summary/i.test(line)) {
        for (let j = i + 1; j < lines.length; j++) {
          const subLine = lines[j].trim();
          if (subLine && !subLine.startsWith("#")) {
            return subLine;
          }
          if (subLine.startsWith("#")) {
            break;
          }
        }
      }
    }
    return "";
  }
}

// Lazy-load dependencies on default import to avoid circular dependency / premature initialization issues
import { themeStore } from "../stores/theme.svelte";
export const entityTemplateService = new EntityTemplateService({
  get themeStore() {
    return themeStore;
  },
});
