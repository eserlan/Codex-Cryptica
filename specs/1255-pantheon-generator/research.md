# Phase 0 Research: Pantheon / God Generator Landing Tool

**Branch**: `1255-pantheon-generator` | **Date**: 2026-06-11
**Feature**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/1255-pantheon-generator/spec.md)

## Decisions

### 1. Route Slug Mapping

- **Decision**: Register both `"pantheon-generator"` and `"god-generator"` in `validSlugs` in `apps/web/src/routes/(marketing)/generators/[slug]/+page.ts`.
- **Rationale**: The user could search for either a "pantheon generator" or "god generator". Mapping both slugs ensures we capture both search intents and serve the most appropriate SEO page titles/meta descriptions for each keyword group, while keeping the visual component and generation logic unified.
- **Alternatives Considered**: Directing all requests to `/pantheon-generator` with a redirect on `/god-generator`. Rejected because having distinct static routes for each keyword maximizes SEO relevance.

### 2. Multi-Entity Import Mapping

- **Decision**: When generating a "Small Pantheon", return a structured array of `ImportDraft` objects from the generator engine instead of a single merged text.
  - The pantheon itself will be returned as a `faction` entity draft.
  - Each individual deity/spirit will be returned as a `character` entity draft.
  - Relationships will be expressed in the Markdown text using `[[Wiki Links]]` (e.g. `[[Deity A]]` is allied with `[[Deity B]]`).
- **Rationale**: The `SeoImportService` in `apps/web/src/lib/services/seo/import-handler.ts` naturally handles array payloads of `ImportDraft[]` and automatically constructs bidirectional connections for all `[[Wiki Links]]` it finds in the content. This leverages existing codebase functionality with zero modification to the importer.
- **Alternatives Considered**: Returning a single giant `faction` containing all the deities in one note. Rejected because it violates the "Lore as structured entities" goal of Codex Cryptica, which makes individual gods separate cards.

### 3. Local Roll Table Fallback

- **Decision**: Define a robust local fallback generator in `pantheon.ts` using predefined arrays of names, suffixes, domains, rituals, and myths.
- **Rationale**: Ensures the tool remains functional offline, when the user disables AI, or if the Gemini API is rate-limited or fails.
- **Alternatives Considered**: None; this is a mandatory project requirement.
