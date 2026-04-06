# Tasks: Import & Extraction Engine (031-import-file-content)

## Implementation Strategy

We will follow an incremental delivery approach, starting with the core importer library (`packages/importer`), then implementing individual file parsers, and finally layering on the AI Oracle for intelligent extraction and the UI for user interaction.

## Dependencies

- **Phase 1** is the foundation.
- **Phase 3** (Intelligent Extraction) depends on **Phase 2** (Parsing).
- **Phase 4** (UI) connects all layers but can be developed in parallel with mock parsers.

---

## Phase 1: Infrastructure & Package Setup

Goal: Establish the `packages/importer` package structure and shared types.

- [x] T001 Initialize `packages/importer` as a new workspace package with `package.json` and `tsconfig.json`
- [x] T002 [P] Define core types and interfaces in `packages/importer/src/types.ts` (ImportSession, ImportItem, DiscoveredEntity)
- [x] T003 Setup Vitest configuration for `packages/importer` to enable test-driven development

## Phase 2: Foundational Parsers

Goal: Implement low-level parsing for supported file formats without AI.

- [x] T004 [US1] Implement Plain Text parser in `packages/importer/src/parsers/text.ts`
- [x] T005 [P] [US1] Implement DOCX parser in `packages/importer/src/parsers/docx.ts` using `mammoth.js`
- [x] T006 [P] [US2] Implement image extraction in DOCX parser to populate `extractedAssets`
- [x] T007 [P] [US1] Implement PDF text-layer parser in `packages/importer/src/parsers/pdf.ts` using `pdfjs-dist`
- [x] T008 [P] [US4] Implement JSON structure analyzer in `packages/importer/src/parsers/json.ts`

## Phase 3: Oracle-Driven Intelligent Extraction

Goal: Connect parsers to the Gemini API for intelligent content splitting and Markdown generation.

- [x] T009 [US1] Create `packages/importer/src/oracle/prompt-factory.ts` to manage extraction prompts (extraction of nodes, wikilinks)
- [x] T010 [US1] Implement `packages/importer/src/oracle/analyzer.ts` to send parsed text to Gemini and receive structured JSON results
- [x] T011 [US4] Implement intelligent JSON mapping logic to transform generic JSON data into `DiscoveredEntity` objects
- [x] T012 [US3] Implement connection discovery logic to ensure the Oracle identifies and preserves Wiki-links in generated content

## Phase 4: Persistence Layer

Goal: Write extracted nodes and assets to the project storage (OPFS).

- [x] T013 [US1] Implement `packages/importer/src/persistence.ts` to transform `DiscoveredEntity` objects into Markdown files with YAML frontmatter
- [x] T014 [US2] Implement asset persistence logic to save extracted images to the media folder in OPFS

## Phase 5: UI Integration

Goal: Expose the import engine to the user via a polished Svelte interface.

- [x] T015 Define and implement UI trigger point (e.g., "Import" button in Vault explorer or Settings)
- [x] T016 Create `apps/web/src/lib/features/importer/ImportModal.svelte` for file uploading and progress tracking
- [x] T017 [P] Implement `apps/web/src/lib/features/importer/ReviewList.svelte` to allow users to preview and edit `DiscoveredEntity` items before saving
- [x] T018 Connect UI to the `importer` package logic and handle file drop/select events
- [x] T019 Implement visual feedback for parsing and AI analysis states (progress bars, status indicators)

## Phase 6: Polish & Verification

Goal: Ensure stability, performance, and cross-platform compatibility.

- [x] T020 Add E2E tests in `apps/web/tests/importer.spec.ts` for end-to-end import flow (Upload -> Process -> Review -> Save)
- [x] T021 Optimize heavy dependencies (`pdfjs`, `mammoth`) to ensure lazy loading and minimal impact on initial app bundle
- [ ] T022 Manual verification: Import a "Lore Bible" DOCX with images and verify graph fragmentation and link preservation
