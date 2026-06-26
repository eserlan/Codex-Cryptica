# Feature Specification: Generic CC Import Format and Import Engine

**Feature Branch**: `138-generic-cc-importer`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Generic CC Import Format and Import Engine (epic #1534, subissue #1535). A deterministic, no-AI import system that converts a shared 'CC import package' (emitted by source adapters) into Codex Cryptica vault data."

## Overview

This feature defines the **shared intermediate format** ("CC import package") and the **deterministic import engine** that every mechanical importer (Markdown/Obsidian, CSV, JSON, Kanka, World Anvil, Notion, PDF, DOCX, Scabard) will target. Source adapters parse external material and emit a CC import package; the generic engine validates it, lets the user preview and curate it, commits approved drafts into the vault, and produces an import report.

This is the foundation issue of epic #1534. **Source adapters are out of scope here** — they are separate subissues (#1536–#1544) that depend on this one. The only adapter behaviour assumed here is that adapters produce a CC import package and never write to the vault directly.

This deterministic importer **complements, and does not replace, the existing AI/Oracle importer** (`packages/importer/src/oracle`). The two are parallel tracks: the Oracle path extracts structure from unstructured prose using AI; this path performs a predictable, repeatable, no-AI mapping from already-structured source data. No AI calls occur anywhere in this feature.

## Clarifications

### Session 2026-06-26

- Q: On re-import, when the user chooses "update" for a draft matching an existing vault entity, how should the update touch that entity? → A: Overwrite only the fields the import draft supplies (title, content, tags, etc.); leave all other entity fields (e.g. user-added image, art direction, soundbite, manual edits) untouched.
- Q: When a relationship draft links source → target, should the engine write the connection on one side or both? → A: One-directional — write the connection only on the source entity, exactly as the draft states; do not invent a reciprocal connection on the target.
- Q: Where is the durable source reference stored on each imported entity? → A: Reuse the existing `discoverySource` field, storing a structured string of the form `<system>:<type>:<id>` (e.g. `kanka:character:12345`); no schema change.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Preview and commit a structured import (Priority: P1)

A worldbuilder has run a source adapter over their external material and now holds a CC import package containing entity drafts, relationship drafts, and asset drafts. They open the import preview, see exactly what will be created, optionally ignore items they do not want, and commit. The approved drafts appear in their vault as entities and connections, and they receive a report summarising what happened.

**Why this priority**: This is the core promise of the entire epic — turning a validated import package into vault data, with a preview gate, deterministically. Without it, no adapter can deliver value. It is the MVP.

**Independent Test**: Feed the engine a hand-written valid CC import package (no adapter required), open the preview, commit, and verify the entities/connections exist in the vault and the report matches what was committed.

**Acceptance Scenarios**:

1. **Given** a valid CC import package with N entity drafts, **When** the user opens the import preview, **Then** all N drafts are listed with their resolved target type, title, tags, and content, and a running count of what will be created is shown.
2. **Given** an import preview, **When** the user marks some drafts as ignored and commits, **Then** only the non-ignored drafts are written to the vault and the ignored ones appear in the report as skipped.
3. **Given** an approved import, **When** the commit completes, **Then** every created entity carries a source reference identifying its source system and source ID/path.
4. **Given** a completed commit, **When** the user views the import report, **Then** it states counts of entities created, relationships created/unresolved, assets imported, items skipped, and warnings.

---

### User Story 2 - Resolve explicit links between drafts (Priority: P1)

The import package describes relationships between drafts using the source system's own identifiers (e.g. "character 12345 is located_in location 678"). The engine resolves these references — both to other drafts in the same package and to entities already in the vault — and turns them into vault connections. References that cannot be resolved are reported rather than silently dropped or guessed.

**Why this priority**: Relationships are a defining value of importing into Codex Cryptica versus a flat note dump. Resolution must be deterministic (exact-match on source ID, not fuzzy/semantic) and unresolved references must surface clearly. This ships alongside US1 in the MVP.

**Independent Test**: Provide a package with relationship drafts referencing (a) another draft in the package, (b) an existing vault entity by prior source ID, and (c) a non-existent target. Commit and verify the first two become connections and the third appears as an unresolved reference in the report.

**Acceptance Scenarios**:

1. **Given** a relationship draft whose source/target both correspond to drafts in the same package, **When** the import commits, **Then** a connection is created between the two resulting vault entities.
2. **Given** a relationship draft whose target matches an entity already in the vault by source reference, **When** the import commits, **Then** a connection is created to that existing entity.
3. **Given** a relationship draft whose target matches nothing, **When** validation/commit runs, **Then** the reference is recorded as unresolved with enough detail (source ids, relationship type) for the user to act on it, and no connection is invented.
4. **Given** an unresolved reference, **When** the report is produced, **Then** the unresolved reference is listed and the import is still considered successful.

---

### User Story 3 - Repeat import and update tracking (Priority: P2)

A user re-imports the same external source after editing it externally. Because every imported entity carries a stable source reference, the engine recognises which drafts correspond to entities it imported before and flags them as potential updates rather than creating duplicates. The user decides per item whether to skip, create new, or update — no merging happens without explicit approval.

**Why this priority**: Repeat/update import is an epic acceptance criterion and a major reason source IDs are preserved. It builds directly on US1's source-tracking but is not required for a first usable import, so it is P2.

**Independent Test**: Commit a package, then commit a second package with the same source IDs and changed content. Verify the engine detects the existing entities, presents them as updates (not new), and applies the user's per-item choice without any automatic fuzzy merge.

**Acceptance Scenarios**:

1. **Given** entities previously imported from source system S, **When** a new package from S contains drafts with the same source IDs, **Then** the preview marks those drafts as "matches existing" and defaults to no destructive action until the user chooses.
2. **Given** a draft matched to an existing entity, **When** the user chooses "update", **Then** the existing entity is updated per deterministic mapping and its source reference is preserved.
3. **Given** a draft matched to an existing entity, **When** the user chooses "skip" or "create new", **Then** the engine honours that choice exactly and never merges automatically.
4. **Given** two drafts that are similar but have different source IDs, **When** the preview is shown, **Then** they are NOT proposed as duplicates (no fuzzy duplicate detection).

---

### Edge Cases

- **Invalid package**: A package with an unsupported/missing version, missing required fields, or malformed drafts is rejected before preview with a clear validation error; nothing is written.
- **Empty package**: A package with zero drafts produces a valid, empty preview and a report noting nothing was imported.
- **Unmapped type**: An entity draft whose source type has no deterministic mapping falls back to the default `note` type, and the fallback is surfaced in the preview and report rather than failing.
- **Duplicate source IDs within one package**: Two drafts sharing a source ID inside the same package are flagged as a package-level warning; the engine does not silently pick one.
- **Asset without bytes / oversized asset**: An asset draft referencing data that is missing or too large is reported as a warning and skipped, without blocking the rest of the import.
- **Partial commit failure**: If writing one draft fails mid-commit, the report records which items succeeded and which failed; the engine does not leave relationship drafts pointing at entities that were never created.
- **Self-referential or dangling relationship**: A relationship whose source and target are identical, or whose endpoints were ignored/skipped by the user, is reported as unresolved rather than creating a broken connection.
- **Adapter contract violation**: A package that attempts to specify a direct vault write or out-of-band mutation is rejected; adapters may only describe drafts.

## Requirements _(mandatory)_

### Functional Requirements

#### CC Import Package (the shared format)

- **FR-001**: The system MUST define a versioned CC import package containing, at minimum: format version, source system identifier, human-readable source label, a list of entity drafts, a list of relationship drafts, a list of asset drafts, and a list of warnings.
- **FR-002**: Each entity draft MUST be able to carry: a source ID and/or source path, a desired/declared source type, a title, body content, tags, optional extended lore, optional metadata fields, and optional grouping/parent reference — mapping onto the vault's existing entity fields (title, type, tags, content, lore, connections, etc.).
- **FR-003**: Each relationship draft MUST identify its source endpoint, its target endpoint, and a relationship type/label, expressed using source identifiers (not vault IDs, which do not yet exist at adapter time).
- **FR-004**: Each asset draft MUST be able to carry the asset bytes/reference, an original name, a MIME type, and a placement reference linking it to the entity/content that uses it.
- **FR-005**: The package format MUST be expressible as plain serialisable data so any adapter (in any of the subissues) can produce it without depending on engine internals.

#### Validation

- **FR-006**: The engine MUST validate an incoming package against the format and reject packages with an unsupported version, missing required fields, or structurally invalid drafts, before any preview or write.
- **FR-007**: Validation MUST surface every problem found (not just the first) with enough context to identify the offending draft.
- **FR-008**: The engine MUST treat adapter-supplied warnings as first-class: they are carried through validation into the preview and final report.

#### Deterministic mapping

- **FR-009**: The engine MUST map each entity draft to a vault entity using deterministic rules only — derived from the draft's declared type and/or configured mapping rules — with NO AI calls and NO inference of type from prose content.
- **FR-010**: When no mapping rule applies, the engine MUST fall back to the default `note` type and record that a fallback was applied.
- **FR-011**: The engine MUST preserve the source system and source ID/path on every committed entity as a durable source reference, sufficient to recognise the same source item on a later import. The reference MUST be stored in the entity's existing `discoverySource` field as a structured string of the form `<system>:<type>:<id>` (e.g. `kanka:character:12345`); no new entity schema field is introduced for this.
- **FR-012**: Mapping MUST be repeatable: the same input package and the same mapping rules MUST produce the same vault result every time.

#### Link resolution

- **FR-013**: The engine MUST resolve relationship endpoints by exact match on source identifiers — first against other drafts in the same package, then against existing vault entities via their stored source references.
- **FR-014**: The engine MUST NOT perform fuzzy, semantic, or prose-based relationship extraction or matching.
- **FR-015**: Relationship endpoints that cannot be resolved MUST be recorded as unresolved references (with their source ids and type) and reported; the engine MUST NOT fabricate a connection for them.
- **FR-016**: Resolved relationships MUST be written as vault connections consistent with the existing connection model (target, type/label).
- **FR-016a**: Connections MUST be written one-directionally — only on the source entity, as the draft states. The engine MUST NOT fabricate a reciprocal connection on the target entity or derive a reverse relationship label the source did not provide.

#### Preview & curation

- **FR-017**: The engine MUST present a preview of all entity, relationship, and asset drafts, showing the resolved target type, title, tags, and a content indication for each, before anything is committed.
- **FR-018**: Users MUST be able to mark individual items as ignored/excluded before commit; ignored items MUST NOT be written.
- **FR-019**: The preview MUST flag drafts that match existing vault entities (by source reference) as potential updates, and MUST flag fallback-typed drafts and unresolved references.
- **FR-020**: The system MUST require explicit user approval to commit; no import writes to the vault without the user confirming the preview.

#### Repeat import / duplicate handling

- **FR-021**: For drafts whose source reference matches an existing entity, the engine MUST offer the user a per-item choice of at least: skip, create new, or update — and apply exactly the chosen action. When "update" is chosen, the engine MUST overwrite only the fields the draft supplies (e.g. title, content, tags, lore) and MUST preserve all other fields on the existing entity (e.g. image, art direction, soundbite, and any manual user edits); it MUST NOT clear vault-only fields absent from the draft.
- **FR-022**: The engine MUST NOT merge, overwrite, or deduplicate entities automatically; any merge requires explicit per-item user approval.
- **FR-023**: Drafts with differing source IDs MUST NOT be proposed as duplicates of each other (no fuzzy duplicate detection).

#### Commit & reporting

- **FR-024**: On commit, the engine MUST write only approved (non-ignored) drafts into the vault, creating entities first and then connections so relationships reference real entities.
- **FR-025**: The engine MUST produce an import report after commit summarising: entities created, entities updated, items skipped/ignored, relationships created, unresolved references, assets imported, assets skipped, fallbacks applied, and all warnings.
- **FR-026**: If individual writes fail during commit, the report MUST record per-item success/failure and the engine MUST avoid leaving connections that point at entities it failed to create.
- **FR-027**: All processing (validation, mapping, preview, commit) MUST run client-side, consistent with the project's privacy/client-side principle; source data MUST NOT be sent to any AI or external service as part of this feature.

#### Boundaries / contract

- **FR-028**: Source adapters MUST interact with the vault only by emitting a CC import package; the engine MUST be the sole writer to the vault for imports, and MUST reject any package that attempts a direct write or non-draft mutation.

### Key Entities _(include if feature involves data)_

- **CC Import Package**: The shared intermediate artifact an adapter produces. Holds version, source system, source label, entity drafts, relationship drafts, asset drafts, and warnings. Plain serialisable data; the contract between every adapter and the engine.
- **Entity Draft**: A pre-vault description of one entity — source ID/path, declared source type, title, content, tags, optional lore/metadata/parent. Maps deterministically onto a vault entity.
- **Relationship Draft**: A pre-vault description of one explicit link between two source items, by source identifier, with a type/label. Resolved into a vault connection or reported as unresolved.
- **Asset Draft**: A pre-vault description of one media/file asset (bytes/reference, name, MIME type, placement reference) attached to an entity/content.
- **Source Reference**: A durable identifier (source system + source ID/path) stored on every committed entity, enabling repeat-import recognition and update tracking. No automatic merging is keyed off it without user approval.
- **Import Session / Preview**: The in-progress, curatable view of a package — per-item include/ignore and (for matches) skip/create/update decisions — held client-side until the user commits.
- **Import Report**: The post-commit summary of what was created, updated, skipped, unresolved, and warned, plus per-item outcomes on partial failure.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can take a valid CC import package, preview it, and commit it into their vault in a single guided flow without writing any code or editing source files.
- **SC-002**: 100% of committed entities carry a source reference that lets a later import of the same source recognise them (verified by re-import detecting matches).
- **SC-003**: Re-importing an identical package produces zero unintended duplicate entities — every item is recognised as an existing match and acted on per the user's explicit choice.
- **SC-004**: 100% of relationship endpoints that cannot be exact-matched are reported as unresolved; zero connections are created for unresolved or ignored endpoints.
- **SC-005**: Given the same input package and mapping rules, repeated imports produce identical vault results (deterministic and repeatable).
- **SC-006**: No import operation triggers an AI call or transmits source content to an external service (verifiable: zero AI/network calls attributable to the import path).
- **SC-007**: Every commit yields an import report whose totals reconcile exactly with what was written to the vault (created + updated + skipped + failed = total drafts presented).
- **SC-008**: An invalid package is rejected before any vault write, with the user shown at least one actionable validation message and no partial state left behind.

## Assumptions

- "CC" refers to Codex Cryptica; the package is the project's internal intermediate import representation, not an external standard.
- The engine lives as a standalone package in `packages/` (per the Library-First principle), reusing the existing entity and connection models rather than inventing parallel ones.
- Source type → entity type mapping rules are deterministic and configurable, with `note` as the universal fallback; defining the full default rule set per adapter is the responsibility of each adapter subissue, not this one.
- Asset storage uses the vault's existing asset mechanism; this feature defines how asset drafts are described and routed, not a new storage backend.
- This feature deliberately diverges from Constitution principle IV ("AI-First Extraction") for this code path: it is the explicit no-AI, deterministic complement to the Oracle importer, justified by the epic's core principles. The Oracle importer remains unchanged.
- The visible UI surface (exact preview layout, controls) is owned by the web app as a thin layer over this package; this spec fixes the behaviour and data the UI must expose, not its pixels.

## Out of Scope

- Any specific source adapter (Markdown/Obsidian, CSV, JSON, Kanka, World Anvil, Notion, PDF, DOCX, Scabard) — subissues #1536–#1544.
- AI-assisted extraction, classification, or relationship inference (covered by the existing Oracle importer).
- Fuzzy duplicate detection or automatic merging.
- External API/login integrations to source systems.
- Server-side/cloud import processing.
