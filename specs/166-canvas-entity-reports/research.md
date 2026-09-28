# Phase 0 Research: Canvas Entity Reports

The spec left no `[NEEDS CLARIFICATION]` markers (both were resolved with the stakeholder before planning). This research instead resolves the _technical_ decisions the plan depends on, each grounded in an existing pattern already in the codebase rather than a new one.

## R1: How should a report become a saved vault entity?

**Decision**: Reuse the exact shape of `apps/web/src/lib/services/delve-dossier-service.ts`'s `DelveDossierService.finalize()` — a small, constructor-injected service (`DelveDossierServiceDeps`-style) that calls `vault.createEntity("note", title, { content, labels: ["report"], kind: "report", report: <provenance> })` for a new report, or `vault.updateEntity(id, { ...})` for an explicit regeneration, then hands the id to `modalUIStore.openZenMode(entityId)`.

**Rationale**: This is a live, working, tested precedent for "canvas content → structured markdown → saved Note entity → opened in Zen Mode" in this exact codebase, created for a different feature (Delve dossiers) but structurally identical to what FR-013 needs. Reusing its shape means: DI/testability (Principle VIII) comes for free, the `kind` discriminator field is an established convention (not a new one this feature invents), and reviewers already know how to read this pattern.

**Alternatives considered**:

- _A new entity type instead of `kind` on a Note_ — rejected: Constitution and existing code (`StatSheetEntityCategory`, `entity-card-dossier.ts`'s `DossierEntity.kind`) already treat "kind" as the vault's mechanism for specialized note subtypes; a new top-level `Entity` type would mean schema changes, migration, and touching every place that switches on `entity.type`, for no benefit the spec requires (per spec Assumptions: "not a new top-level entity type").
- _Auto-saving on every option change_ — rejected: spec's Edge Cases and FR-002/FR-011 are explicit that nothing is written to the vault until the GM saves; this also avoids flooding the vault with entities while the GM is still adjusting Include/Detail toggles.

## R2: Where do the "explicit relationships" come from per entry point?

**Decision**: Two relationship sources, matching FR-006/FR-006a exactly:

- **Canvas-sourced**: read from the canvas's own `edges` (via existing `canvas-workspace-helpers.ts` `flowEdgeToCanvasEdge`-style mapping), never `entity.connections`.
- **Graph/Table-sourced**: read from each selected entity's own `entity.connections` array, filtered to pairs where both endpoints are in the selection — the same filter `GuestExporter.export()` already applies when building `guestRelationships` from `entity.connections`.

**Rationale**: `GuestExporter` (packages/vault-engine/src/services/GuestExporter.ts) already implements exactly this "connections filtered to an included-entity set" logic for a different feature (guest publishing). It's proven, tested, and privacy-reviewed. The canvas-edges-vs-entity-connections split is not a new idea either — `GuestExporter` also has a parallel "guestCanvases" path that filters canvas nodes/edges independently of entity-level connections, confirming these are already treated as two distinct data sources in this codebase, not one derived from the other.

**Alternatives considered**: Always sourcing from `entity.connections` even on a canvas (simpler, one code path) — rejected because it would violate the Q2-resolved principle (spec FR-019/FR-005) that a canvas report reflects only what's deliberately drawn on _that_ canvas, not the entity's vault-wide connections.

## R3: How does a saved report stay readable without a dedicated view?

**Decision**: There is **no report-specific viewing or editing surface at all** (FR-013b, tightened during planning at the stakeholder's explicit direction). The report's saved content (`entity.content`, the note's main body — unlike `delve-dossier-service.ts`, which puts its body in `lore`; Zen shows `lore` only outside guest mode under a themed "Lore" heading, so a report kept there would read like a lore appendix rather than the document itself) is Markdown with a **predictable, self-authored heading grammar** (a fixed `## <Section>` vocabulary: Overview, per-entity sections as `### <Entity name>`, a `## Relationship Summary`, `## Factions`). That's the entire mechanism: the existing `ZenView`/`MarkdownEditor` already renders headings, sub-headings, and lists distinctly for every note, so a well-structured report simply _looks_ structured when opened — the same way any other well-written note with headings does. No component parses the markdown back into a structure at read time; no separate "read mode" exists.

**Rationale**: This is simpler than the previously-considered "parse markdown back into a `ReportDocument` for a dedicated read-mode" approach (superseded — see below), and was the stakeholder's explicit correction: reports must be viewed/edited exactly like any other Zen Mode entity, full stop. It also removes an entire class of risk this research file previously had to reason about (a hand-edit breaking a read-mode parser), because there is no parser to break.

**Superseded alternative** (considered and initially chosen, then corrected): _A `ReportZenContent.svelte` component that parses the saved markdown's heading grammar into a `ReportDocument` for read-mode-only structured formatting, falling back to plain rendering if parsing failed._ Rejected once the requirement was clarified to disallow any report-specific viewing surface — not because the parsing approach was unsound, but because it solved a problem (distinct read-mode formatting) the feature turned out not to want at all.

- _A structured block AST persisted alongside the markdown_ (like `packages/stat-sheet-engine`'s `BlockNode`/`PresentationRenderer` system) — still rejected for the same reason plus the above: unneeded generality for a narrower shape (entities, relationships, factions), and no distinct rendering surface to justify it.
- _A fully separate rich-text editor for reports_ — still rejected: duplicates editing infrastructure the vault already has, and directly contradicts FR-013b/FR-013c.

## R4: How does export-to-external-format work?

**Decision**: Reuse `apps/web/src/lib/services/ClipboardService.ts` (`copyContent({ markdown, html? })`), which already turns Markdown into a sanitized HTML+plaintext clipboard payload via `marked` + `DOMPurify` — the same mechanism used for entity copy (`copyEntity`) and by 2815-smart-copy. `ReportService.export()` builds the Markdown from the saved `ReportDocument`/entity content and calls `clipboardService.copyContent(...)`.

**Rationale**: FR-020 only requires "at minimum, Markdown or an equivalent that preserves headings and structure" — `ClipboardService` already produces exactly that shape for other features. No new dependency, no new sanitization surface to review.

**Alternatives considered**: Word (.docx) / PDF generation — explicitly deferred per spec Assumptions; not researched further here since it's out of this feature's scope.

## R5: Selection state for Graph view and Table view

**Decision**:

- **Graph view**: read Cytoscape's existing selection (`cy.$("node:selected")`), the same primitive `SelectionConnector.svelte` already uses for its 2-node "connect" flow, generalized to N nodes for the report trigger.
- **Table view**: `apps/web/src/routes/(app)/table/+page.svelte` already has row selection (`selectedIds`, `selectedVisible`, select-all, and a bulk-actions bar with "Add / remove labels"). This feature adds a "Generate report" button to that bulk bar, backed by a new small `table-report-generation.ts` module that maps `selectedVisible` ids to a `ReportInput` (per Bounded Responsibility Check) rather than inline logic in the already-850-line route file. _(Corrected during task generation: an earlier draft of this file wrongly said the Table had no selection UI.)_

**Rationale**: Graph view selection is free — Cytoscape already tracks it and another feature already consumes it. Table view selection already exists; only the report-input mapping is new, kept in its own module to avoid growing a file already over the Bounded Responsibility trigger.

**Alternatives considered**: Building a generic bulk-report framework — rejected as speculative (Principle III, YAGNI); the module is written narrowly for "selected entities → report input".

## R6: Where does a report's provenance live, and how does Regenerate use it?

**Decision**: A new optional, typed `report` field on `EntitySchema` (origin, canvasId/selection, entityIds, include/detail options, generatedAt, contentHash) — see data-model.md. Regenerate rebuilds its input from that field alone and detects manual edits by comparing `hashReportContent(content)` to `report.contentHash`.

**Rationale**: `Entity.metadata` is a fixed Zod object (`coordinates`, `width`, `height`), so extra keys would be untyped and would be stripped by `EntitySchema.parse`. Checked: `stringifyEntity` writes every entity field to frontmatter and `parseMarkdown` reads it back without stripping, so a typed additive field round-trips on disk, and it is the same approach `statSheet` and `languageProfile` already take. Storing the entity ids and options (not only a scope descriptor) is what lets Regenerate work for Graph/Table and "selected nodes" reports, where the original selection no longer exists.

**Alternatives considered**: Loosening `metadata` to a passthrough record — rejected (untyped, affects every entity). A separate IndexedDB store for provenance — rejected (a second persistence path that would not travel with the vault files).

## R7: Keeping reports out of guest and public output

**Decision**: `GuestExporter.export()` skips `kind: "report"` entities (and connections that target them).

**Rationale**: The exporter strips `lore` and `artDirection` but not `content` or titles, and a report may contain GM-only text once the GM opts in. Excluding the kind is a one-line, testable rule in the single place both the guest snapshot and the public directory already go through.
