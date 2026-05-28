# Research: Default Entity Templates

**Branch**: `123-entity-templates` | **Date**: 2026-05-28

## Decisions & Rationale

### 1. Architectural Placement of Template Resolving

- **Decision**: Put all template resolution logic inside a new client-side service `EntityTemplateService.svelte.ts` rather than in the core `@codex/vault-engine`.
- **Rationale**: The core `VaultRepository` and its mutations are designed to be single-responsible and independent of the active theme state or Svelte UI contexts. Resolving template overrides requires reading filesystem directories and accessing theme settings, which is naturally a web-level/service-level concern in the application lifecycle. Keeping the engine pure keeps tests simpler and maintains clean layering.

### 2. Custom Templates Directory Location

- **Decision**: Check `.cc/templates/` first, and fall back to `.codex/templates/` case-insensitively for the filename.
- **Rationale**: `.cc` is the modern vault metadata and configuration directory, while `.codex` is supported for compatibility. Case-insensitivity ensures that user-created template files match gracefully regardless of casing (e.g., `character.md` or `Character.MD` matches `Character` entity type).

### 3. Graceful Fallback Strategy

- **Decision**:
  1. Local Custom Override (even if empty string)
  2. Theme-Specific Built-In Default (`Fantasy`, `Sci-Fi`)
  3. Generic Built-In Default
  4. Empty String (for unknown types)
- **Rationale**: Keeps creation robust. Empty files must be respected to allow advanced users to explicitly suppress templates for certain types.

## Alternatives Considered

- **Embedding templates in `@codex/vault-engine` mutations**: Rejected because the core engine shouldn't be coupled to Svelte stores (like `themeStore`) or have to deal with localized file parsing routines that are client-specific.
- **Requiring system templates to be actual files on disk**: Rejected because it adds overhead, permission prompts, or creation delays. Hardcoding default fallbacks ensures zero-latency page pre-population.
