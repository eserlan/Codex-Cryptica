# Data Model & Interfaces: Default Entity Templates

**Branch**: `123-entity-templates` | **Date**: 2026-05-28

## Data Models

### 1. Template Configurations Map

We define a configuration mapping of the built-in system generic and theme-specific templates.

```typescript
export interface TemplateMap {
  character?: string;
  faction?: string;
  location?: string;
  item?: string;
  event?: string;
  creature?: string;
  note?: string;
  [key: string]: string | undefined;
}
```

## Interface Contracts

### 1. `EntityTemplateService` Class

Exposes methods to check files and resolve the correct template.

```typescript
export class EntityTemplateService {
  /**
   * Resolves the markdown template to pre-populate an entity with.
   *
   * @param type - The entity type (e.g., 'character', 'location')
   * @param themeId - The active theme ID (e.g., 'fantasy', 'scifi')
   * @param customTemplatesDirHandle - FileSystemDirectoryHandle pointing to the local templates folder
   * @returns The resolved template content as a string
   */
  async resolveTemplate(
    type: string,
    themeId: string,
    customTemplatesDirHandle?: FileSystemDirectoryHandle | null,
  ): Promise<string>;
}
```
