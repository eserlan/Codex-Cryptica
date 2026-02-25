# Implementation Plan: Implement llms.txt standard

**Branch**: `057-add-llms-txt` | **Date**: 2026-02-22 | **Spec**: [specs/057-add-llms-txt/spec.md](./spec.md)
**Input**: Feature specification from `/specs/057-add-llms-txt/spec.md`

## Summary

Implement the `/llms.txt` and `/llms-full.txt` standards to improve project discoverability and ingestion for AI agents. This involves creating static Markdown summaries and an automated concatenation script for full documentation, integrated into the SvelteKit build process.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Svelte 5 + SvelteKit, `@sveltejs/adapter-static`
**Storage**: N/A (Static files)
**Testing**: Playwright (E2E), Vitest (Unit)
**Target Platform**: Web (Static)
**Project Type**: web
**Performance Goals**: Documentation files must load in < 1s.
**Constraints**: Must be compatible with `@sveltejs/adapter-static` and GitHub Pages deployment.
**Scale/Scope**: 2 new files in `apps/web/static/`, updates to `app.html` and `robots.txt`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: Logic for documentation flattening will be a standalone script in `scripts/`.
- **II. TDD**: E2E tests will verify file presence and content-type.
- **III. Simplicity & YAGNI**: No heavy libraries; using standard Node `fs` for file concatenation.
- **IV. AI-First Extraction**: N/A.
- **V. Privacy & Client-Side Processing**: Files are public and static.
- **VI. Clean Implementation**: Complies with Svelte 5 structure.
- **VII. User Documentation**: The files themselves ARE documentation.

## Project Structure

### Documentation (this feature)

```text
specs/057-add-llms-txt/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── static/
│   ├── llms.txt         # Manual summary
│   ├── llms-full.txt    # Generated full doc
│   └── robots.txt       # Updated with allow rules
├── src/
│   └── app.html         # Added discoverability link
scripts/
└── generate-llms-full.mjs # Concatenation logic
```

**Structure Decision**: Integrated into existing `apps/web` structure as static assets with a root-level helper script for automation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
