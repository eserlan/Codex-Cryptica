# Implementation Plan: Import & Extraction Engine

**Branch**: `031-import-file-content` | **Date**: 2026-02-01 | **Spec**: [spec.md](../spec.md)
**Input**: Feature specification from `/specs/031-import-file-content/spec.md`

## Summary

Implement a file import system capable of ingesting PDF, DOCX, TXT, and JSON files. The system will extract text and images, utilizing the AI Oracle to parse unstructured content into structured Codex Nodes (Entities) and identify connections. This moves the logic from simple file reading to intelligent, AI-driven content migration.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**:

- `svelte` (UI)
- `@google/generative-ai` (Oracle Analysis)
- `mammoth.js` (DOCX Parsing - NEEDS VERIFICATION)
- `pdfjs-dist` (PDF Parsing - NEEDS VERIFICATION)
- `tiptap` (or similar for intermediate editor, though parsing to Markdown is goal)
  **Storage**: OPFS (Origin Private File System) via `editor-core`.
  **Testing**: Vitest (Unit), Playwright (E2E).
  **Target Platform**: Browser (Client-side processing preferred for privacy/speed, fallback to server if needed).
  **Project Type**: Monorepo (Web App + Packages).
  **Performance Goals**: Parse <5MB files in <3s.
  **Constraints**: Browser environment limits for heavy parsing (PDF).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1.  **Library-First**: Core parsing logic should reside in a package (likely `packages/importer`), not just the Svelte app.
2.  **Test-First**: Unit tests for parsers (mocking files) are essential.
3.  **Simplicity**: Use established libraries (`mammoth`, `pdfjs`) rather than writing custom parsers.

## Project Structure

### Documentation (this feature)

```text
specs/031-import-file-content/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      lib/
        features/
          importer/      # UI Components & State Management

packages/
  importer/         # [NEW] Package for parsing and extraction logic
    src/
      parsers/
        docx.ts
        pdf.ts
        json.ts
      oracle/
        analyzer.ts      # AI Entity Extraction Logic
    tests/
```

**Structure Decision**: We will introduce a `packages/importer` to encapsulate the file parsing and AI extraction logic, keeping the UI layer thin.

## Complexity Tracking

| Violation                         | Why Needed                                                                      | Simpler Alternative Rejected Because                                                           |
| --------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| New Package (`packages/importer`) | Parsing dependencies (pdfjs, mammoth) are heavy and distinct from editor logic. | Polluting `editor-core` with heavy non-editor deps increases bundle size for non-import flows. |
