# Implementation Plan: Default Entity Templates

**Branch**: `123-entity-templates` | **Date**: 2026-05-28 | **Spec**: [/specs/123-entity-templates/spec.md](file:///home/espen/proj/Codex-Arcana/specs/123-entity-templates/spec.md)
**Input**: Feature specification from `/specs/123-entity-templates/spec.md`

## Summary

Implement default Markdown formats/templates when creating new entities (`Character`, `Faction`, `Location`, `Item`, `Event`, `Creature`, `Note`). The feature will provide built-in system-wide structures, support theme-based fallbacks (such as Fantasy and Sci-Fi characters), look for vault-level custom overrides in `.cc/templates/` (and `.codex/templates/`) case-insensitively, and offer a toggleable checkbox in the UI ("Start from default format") that defaults to `true`. When toggled `false` or when an empty override file is selected, the file will be initialized completely empty.

## Technical Context

**Language/Version**: TypeScript 6.0.3  
**Primary Dependencies**: Svelte 5 Runes, `@codex/vault-engine`  
**Storage**: OPFS (Vault Files) for custom overrides, IndexedDB for settings if persistent (or local-only UI state as specified)  
**Testing**: Vitest (`test:unit` script)  
**Target Platform**: Browser (Chrome/Firefox/Safari)  
**Project Type**: Web Application (SvelteKit)  
**Performance Goals**: Entity creation < 100ms with zero permission prompts or lag  
**Constraints**: Single-responsibility principle (keep `VaultRepository` pure, do not bloat it with UI/theme/template retrieval logic)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First & TDD**: Yes, we will design an isolated `EntityTemplateService.svelte.ts` which handles all template matching, reading, and falling back, and write unit tests for it.
2. **Icon usage class-based only**: Yes, we will NOT use `lucide-svelte` icons, but use Iconify class utilities (e.g. `class="icon-[lucide--...] h-4 w-4"`).
3. **Constructor-based DI**: Yes, `EntityTemplateService` will use constructor-based dependency injection for directory handle fetching and theme state references.
4. **No main commits**: Yes, we are strictly on the `123-entity-templates` branch.

## Project Structure

### Documentation (this feature)

```text
specs/123-entity-templates/
├── plan.md              # Feature plan
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Proposed Source Changes

```text
apps/web/src/lib/
├── services/
│   └── EntityTemplateService.svelte.ts  # [NEW] Service to resolve templates
├── components/
│   └── VaultControls.svelte             # [MODIFIED] Add template option checkbox & resolve content on add
tests/
└── lib/
    └── services/
        └── EntityTemplateService.svelte.test.ts # [NEW] Unit tests for service
```

## Proposed Architecture & Design

### 1. Built-in Default Templates

We will define built-in templates directly in code as constant records/maps. For example:

- **Generic Character**:

  ```markdown
  # Character Name

  ## Summary

  A brief overview.

  ## Appearance

  Physical description.

  ## Personality

  Key traits and behavior.

  ## Goals

  What do they want?

  ## Relationships

  Key connections.
  ```

- **Fantasy Character**:

  ```markdown
  # Character Name

  ## Summary

  A brief overview.

  ## Lineage & Background

  Origin and heritage.

  ## Appearance & Oaths

  Physical description and sacred oaths.

  ## Magical Affinity

  Spells, talents, or connection to the arcane.
  ```

- **Sci-Fi Character**:

  ```markdown
  # Character Name

  ## Summary

  A brief overview.

  ## Augmentations & Tech

  Cybernetics and gear.

  ## Corporate Ties & Reputation

  Factions and street credit.
  ```

### 2. EntityTemplateService

A new class `EntityTemplateService` will expose a clean method:
`resolveTemplate(type: string, themeId: string, customTemplatesDirHandle?: FileSystemDirectoryHandle | null): Promise<string>`

It will follow this exact logic chain:

1. If "Start from default format" is checked:
   - Check if `customTemplatesDirHandle` is available.
   - Look for `{type}.md` (case-insensitive filename search).
   - If override file is found:
     - Read the file content.
     - Return the content (even if empty, as an empty file is a valid user override).
   - If not found or handle is missing:
     - Look for theme-specific default fallback: `THEME_TEMPLATES[themeId]?.[type]`.
     - Fall back to generic system default: `GENERIC_TEMPLATES[type]`.
     - Fall back to `""` if type is unknown.
2. If checkbox is unchecked:
   - Return `""`.

### 3. UI Integration in `VaultControls.svelte`

- Add a local `$state(useTemplate = true)` flag.
- Render a stylish checkbox/toggle input labelled "Start from default format" underneath the Title input.
- On submit, call `EntityTemplateService.resolveTemplate(...)` using the active theme ID and vault directory handles.
- Pass the resolved markdown as `initialData: { content: resolvedContent }` to `vault.createEntity(newType, newTitle, initialData)`.

## Verification & Unit Testing Plan

We will write unit tests in `apps/web/src/lib/services/EntityTemplateService.svelte.test.ts` to verify:

- Graceful generic fallback for all 7 entity types.
- Theme-specific overrides (Fantasy, Sci-Fi) returning correct structures.
- Custom template file retrieval using mock directory and file handles.
- Empty custom override files returning `""` (and not falling back to defaults).
- Unchecked template toggle returning completely blank string.
