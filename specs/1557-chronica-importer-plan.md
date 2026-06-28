# Implementation Plan: Chronica Export Adapter

## Purpose

Build a deterministic Chronica adapter that converts one or more Chronica campaign export JSON files into the generic CC import package format.

Use issue `#1557` and the real `Grecia` export observations as the case study for the first multi-file deterministic adapter:

`Chronica JSON file set -> Chronica assembler -> CCImportPackage -> prepare -> review -> commit -> report`

This plan assumes the Scabard UI alignment work has established the shared CC review, commit, and report flow. Chronica should reuse that path. The new work is the source adapter layer: detection, grouping, assembly, mapping, and validation.

## Assessment Summary

The initial plan was directionally correct but needed tightening in four areas:

- It treated `File[]` as the importer-library contract. The package should stay browser-neutral; the web app may read files, but `packages/importer` should accept parsed JSON documents or raw JSON text.
- It left partial-import policy open too late. First pass should accept any self-consistent Chronica subset and report missing cross-file targets as unresolved references.
- It did not explicitly call out that issue `#1557` mentions fixture files not present in this checkout. Phase 0 must reconcile or recreate those fixtures before parser implementation.
- It did not define source-reference and duplicate-domain behavior tightly enough for repeatable imports.

This revision resolves those gaps and orders the tasks so parser contracts, fixtures, and tests come before web integration.

## Design Goal

The importer should support deterministic adapters that are not limited to one uploaded file.

For Chronica, the system must support:

- a single JSON export that contains one or more campaign domains
- multiple JSON exports from the same Chronica campaign, each carrying one main domain slice
- partial, self-consistent domain imports when the user only has some files

The generic CC engine should still receive one normalized `CCImportPackage`. Chronica-specific file grouping and assembly belong before `ImportEngine.prepare(...)`.

## Source Evidence

Issue `#1557` documents real Chronica `Grecia` export observations:

- top-level object contains `campaign` and `export_created_at`
- `campaign` contains shared metadata such as `id`, `name`, `about`, `created_at`, `updated_at`, `gm_secrets`, `game_system`, `party_wealth`, and `players_count`
- each observed export file appears to contain one main campaign area
- observed domains include `stat_groups`, `maps`, `quests`, `places`, `kinship_folders`, `entity_folders`, `encounters`, `characters`, and `adventure_notes`

The issue also says fixture references were added under:

`packages/importer/tests/fixtures/chronica/grecia/`

At the time this plan was assessed, that fixture directory was not present in the local checkout. Treat fixture reconciliation as Phase 0 work, not as an implementation assumption.

## Current Gap

The deterministic import path is currently Scabard-shaped:

- detect one source JSON file
- parse directly into one `CCImportPackage`
- run the existing CC review, commit, and report path

Chronica requires a broader source-adapter intake layer:

- one import may be composed from several JSON files
- each file may contain campaign metadata plus one or more domain slices
- all files in one import must share the same Chronica campaign ID
- cross-file reference IDs must be preserved even when the target file is absent
- nested folder structures must be traversed without losing folder lineage

The missing abstraction is:

`ChronicaExportDocument[] -> validate group -> assemble normalized Chronica campaign -> emit CCImportPackage`

## Alignment Principles

This plan follows the project constitution and style guide:

- Library-first: Chronica detection, grouping, assembly, and mapping live in `packages/importer`.
- Thin UI binding: `apps/web` reads selected files and passes source documents into importer APIs.
- TDD: detection, assembly, mapping, and web routing each require focused success and failure tests.
- Privacy: all parsing stays client-side; no network, scraping, login, or AI calls.
- Simplicity: no generic multi-adapter framework until a second multi-file adapter proves the need.
- Natural language: validation messages must explain invalid JSON, mixed campaigns, and empty imports plainly.
- Labels over Tags: user-facing copy must say `Labels`; internal CC fields may keep existing schema names.

## Target User Flow

1. User opens the existing importer modal.
2. User selects one or more Chronica JSON files.
3. The web app parses those files into browser-neutral Chronica source documents.
4. The importer library detects and groups the Chronica documents by campaign ID.
5. The adapter rejects mixed campaigns, invalid Chronica JSON, and selections with no importable records.
6. The adapter assembles the selected documents into one normalized Chronica campaign model.
7. The adapter converts the normalized model into one `CCImportPackage`.
8. The app runs `ImportEngine.prepare(...)`.
9. User reviews the existing `CCImportSession` UI.
10. User commits through the existing CC import path.
11. User sees the standard CC import report.

## First-Pass Policy

Chronica first pass should support partial campaign imports.

Accepted:

- one valid Chronica file with at least one importable domain
- several Chronica files from the same `campaign.id`
- cross-file references whose targets are absent, recorded as unresolved references
- duplicate records with the same Chronica source ID when the serialized payload is identical

Rejected before review:

- invalid JSON
- JSON that is not Chronica-shaped
- selections mixing multiple Chronica campaign IDs
- selections mixing Chronica deterministic files with Oracle/unstructured imports
- selections with no importable entity-like records after assembly
- duplicate Chronica source IDs with conflicting payloads

Deferred:

- ZIP upload support
- direct Chronica API/login integration
- map tile import as first-class map objects
- asset persistence beyond existing CC engine behavior

## Proposed Architecture

### 1. Browser-neutral Chronica source documents

Do not expose browser `File` objects from `packages/importer`.

Suggested library input after the caller has parsed JSON:

```ts
export interface ChronicaExportDocument {
  fileName?: string;
  json: unknown;
}
```

The web app can build these from selected files. Tests can build them directly from fixture JSON.

Invalid JSON is therefore a web/file-read failure, while non-Chronica JSON is a library detection failure.

### 2. Chronica intake API

Suggested public surface in `packages/importer/src/cc/chronica.ts`:

```ts
export function detectChronicaExport(
  input: unknown,
): ChronicaExportSummary | null;
export function groupChronicaExports(
  documents: ChronicaExportDocument[],
): ChronicaExportGroupResult;
export function assembleChronicaCampaign(
  group: ChronicaExportGroup,
): ChronicaCampaignSource;
export function parseChronicaExports(
  documents: ChronicaExportDocument[],
): CCImportPackage;
```

Keep naming plural where the API can accept multiple files.

### 3. Normalized Chronica campaign model

Use a normalized intermediate model between raw Chronica JSON and `CCImportPackage`.

It should preserve:

- campaign metadata
- source file names
- domain names
- original Chronica IDs
- folder lineage
- explicit reference IDs
- authored HTML fields
- privacy and visibility fields
- domain-specific metadata

This model keeps raw export concerns out of CC mapping code and makes parser tests easier to read.

### 4. Source reference policy

Use stable, deterministic source refs based on Chronica campaign ID, domain, and record ID.

Recommended shape:

`chronica:<domain>:<campaignId>:<recordId>`

Examples:

- `chronica:character:grecia-id:char-123`
- `chronica:place:grecia-id:place-456`
- `chronica:quest:grecia-id:quest-789`

If Chronica record IDs are only unique within a domain, the domain segment prevents collisions. If IDs are globally unique, keeping the domain still improves readability and diagnostics.

### 5. Reuse existing CC review and report UI

Chronica should not add a custom review component.

Reuse:

- existing importer modal shell
- existing CC review component
- existing CC report component
- existing web `VaultWriter` binding

Only add UI changes where the uploader needs to pass grouped deterministic documents into the CC path or where Chronica source refs stress existing layout.

## Chronica Mapping Rules

Initial deterministic mappings:

- `characters` -> character drafts
- `places` -> location drafts, with settlement subtype retained in metadata if Chronica provides it
- `quests` -> quest drafts, or note fallback if no quest entity type is supported by the active schema
- `adventure_notes` -> note drafts
- `encounters` -> scene or encounter drafts when supported, otherwise note drafts
- `entities` -> item, creature, or note drafts based on `entity_type`
- nested `entity_folders` records -> same mapping as `entities`, with folder lineage metadata
- `kinships` and nested `kinship_folders` records -> faction/group/family drafts based on `kintype`
- `maps` -> note/source-document drafts in first pass, with map metadata retained
- `stat_groups` and `stats` -> metadata and warnings only, not standard entity drafts in first pass

Fallback rule:

- unsupported or ambiguous records become note drafts with source type, original domain, and raw metadata preserved for review

Content preservation:

- preserve `description`, `notes`, `content`, `gm_secrets`, and `about`
- retain HTML as authored content unless an existing importer utility already provides safe HTML-to-Markdown conversion for this path
- preserve visibility fields such as `pc_secret`, `private`, `public`, and `published` in metadata

Relationship policy:

- exact Chronica reference IDs become relationship drafts when the referenced target is present in the assembled model
- missing targets become unresolved references carried into the CC report
- no fuzzy matching and no inferred prose-based links

## Definition Of Done

- one or more Chronica JSON documents can be parsed into one valid `CCImportPackage`
- multiple files must share one `campaign.id`
- mixed campaigns are rejected before review
- duplicate conflicting source IDs are rejected or surfaced as validation failures before review
- nested `entity_folders` and `kinship_folders` are traversed
- authored content and privacy fields are preserved
- explicit references become relationship drafts or unresolved references
- first-pass maps and stats are preserved as metadata, not silently discarded
- Chronica imports reach the existing CC review and report flow without Oracle
- Scabard and Oracle import flows are not regressed

## Implementation Plan

### Phase 0: Fixture And Contract Baseline

Purpose: lock down the evidence and API before implementation starts.

1. Reconcile the issue `#1557` fixture comment with the local checkout.
2. Add or restore `packages/importer/tests/fixtures/chronica/grecia/README.md`.
3. Add or restore `export-manifest.json`, `raw-uploaded-files.txt`, and the available raw Chronica JSON fixture files.
4. Add at least one fixture per implemented domain before writing mapper code for that domain.
5. Define `ChronicaExportDocument`, `ChronicaExportSummary`, `ChronicaExportGroup`, and `ChronicaCampaignSource` types.
6. Record first-pass partial-import policy in the fixture README and parser tests.

Exit criteria:

- fixture directory exists locally
- fixture manifest documents available and missing sample files
- Chronica intake types are defined before mapping code depends on them
- partial-import policy is no longer an open question

### Phase 1: Detection And Grouping

Purpose: identify Chronica documents and group a selected set safely.

1. Add `packages/importer/src/cc/chronica.ts`.
2. Implement `detectChronicaExport(input)` using top-level `campaign` plus `export_created_at`.
3. Extract campaign ID, campaign name, file name, and present domain keys.
4. Implement `groupChronicaExports(documents)`.
5. Return a structured non-Chronica result for parsed JSON that does not match Chronica shape.
6. Reject Chronica selections containing multiple campaign IDs.
7. Reject Chronica selections with no importable domains.
8. Add tests for detection success, non-Chronica JSON, malformed Chronica-shaped objects, multi-file grouping, mixed-campaign rejection, and empty-domain rejection.

Exit criteria:

- Chronica documents are detected without relying on file names
- grouping is deterministic and keyed by `campaign.id`
- invalid grouped inputs fail before assembly

### Phase 2: Assembly

Purpose: merge grouped Chronica documents into one normalized campaign source model.

1. Implement `assembleChronicaCampaign(group)`.
2. Merge campaign-level metadata and verify consistency for stable fields.
3. Preserve source file names per domain record.
4. Normalize root collections: `characters`, `places`, `quests`, `maps`, `encounters`, `adventure_notes`, `stat_groups`.
5. Traverse `entity_folders` and emit nested entity records with folder lineage.
6. Traverse `kinship_folders` and emit nested kinship records with folder lineage.
7. Detect duplicate source IDs with identical payloads and keep one canonical record.
8. Detect duplicate source IDs with conflicting payloads and return a validation failure.
9. Preserve explicit reference IDs and original metadata on normalized records.
10. Add tests for multi-file merge, nested folder traversal, metadata preservation, duplicate identical records, duplicate conflicting records, and inconsistent campaign metadata.

Exit criteria:

- grouped Chronica exports assemble into one normalized source model
- nested records are not lost
- duplicate and consistency behavior is deterministic

### Phase 3: CC Package Mapping

Purpose: convert the normalized Chronica source model into the generic CC package.

1. Implement `parseChronicaExports(documents)`.
2. Generate deterministic `sourceSystem`, `sourceLabel`, package version, and source refs.
3. Map supported Chronica domains to entity drafts according to this plan.
4. Preserve authored HTML/content fields in draft content or metadata.
5. Preserve privacy/visibility fields in metadata.
6. Preserve domain-specific metadata without inventing semantics.
7. Convert explicit reference IDs into relationship drafts when source refs are known.
8. Emit unresolved reference warnings when source refs are not known.
9. Emit warnings for first-pass metadata-only domains such as `stat_groups`.
10. Add tests for each implemented domain mapping, fallback behavior, source refs, relationship drafts, unresolved references, and package validation.

Exit criteria:

- generated Chronica packages pass the existing CC package validator
- source refs are stable across repeated parses
- all implemented mappings have fixture-backed success and failure tests

### Phase 4: Web Importer Intake

Purpose: route Chronica file selections into the existing deterministic CC path.

1. Update `ImportSettings.svelte` to classify deterministic file groups before Oracle analysis.
2. Parse selected JSON files and surface invalid JSON as rejected files.
3. Convert parsed Chronica files into `ChronicaExportDocument[]`.
4. Call `parseChronicaExports(...)` for Chronica groups.
5. Run the existing `ImportEngine.prepare(...)` path for the returned package.
6. Keep Chronica available when Oracle is disabled.
7. Reject mixed Chronica and Oracle/unstructured selections with plain wording.
8. Reject mixed Chronica campaign IDs with plain wording.
9. Preserve the existing Scabard single-file path.
10. Add app-level tests for Chronica multi-file routing, invalid JSON rejection, Oracle-disabled routing, mixed-campaign rejection, mixed-mode rejection, and Scabard regression.

Exit criteria:

- one or more Chronica files can reach CC review without Oracle
- grouped selection errors render in the importer modal
- Scabard and unstructured Oracle imports still follow their existing paths

### Phase 5: Review And Report Fit

Purpose: verify the shared CC UI is sufficient for Chronica output.

1. Check long Chronica source refs in `CCImportReview.svelte`.
2. Check high item counts from `characters` plus other domains.
3. Check unresolved Chronica references in `CCImportReport.svelte`.
4. Add minimal layout or wording adjustments only if the shared CC UI becomes unclear.
5. Add focused component tests for any shared UI adjustments.

Exit criteria:

- Chronica package previews are legible in the shared CC review UI
- unresolved Chronica references are understandable in the shared report
- no Chronica-specific review component is introduced

### Phase 6: Documentation

Purpose: document the user-facing and maintainer-facing behavior.

1. Add Chronica help content when the web flow ships.
2. Explain that Chronica imports may use one JSON file or several JSON files from the same campaign.
3. Explain that missing cross-file targets appear as unresolved references.
4. Explain mixed-campaign and invalid-file failures in plain language.
5. Update fixture README with observed domains and expected mappings.
6. Add tests for new help-content entries.

Exit criteria:

- users can understand how to select Chronica files
- maintainers can understand how fixtures map to implemented domains
- user-facing docs use `Labels`, not `Tags`

### Phase 7: Final Verification

Purpose: prove Chronica works and protect existing importer behavior.

1. Run focused Chronica importer tests.
2. Run focused CC package validation tests for Chronica output.
3. Run focused web importer tests for Chronica grouped intake.
4. Run `bun run lint`.
5. Run `bun run test`.
6. Manually smoke-test a valid multi-file Chronica import.
7. Manually smoke-test a valid single-file Chronica import if a complete single-file fixture exists.
8. Manually smoke-test mixed-campaign rejection.
9. Manually smoke-test Scabard import with Oracle disabled.

Exit criteria:

- supported Chronica fixtures import through CC review without Oracle
- invalid Chronica selections fail clearly before review
- existing Scabard and Oracle flows are not regressed

## Testing Strategy

Required coverage:

- Chronica detection without file-name dependence
- non-Chronica JSON is ignored by Chronica detector
- multi-file grouping by campaign ID
- mixed-campaign rejection
- empty-domain rejection
- nested `entity_folders` traversal
- nested `kinship_folders` traversal
- duplicate identical record handling
- duplicate conflicting record failure
- deterministic source refs
- each implemented domain mapping
- fallback-to-note behavior
- relationship draft creation
- unresolved reference warning/reporting
- package validation for Chronica output
- web routing with Oracle disabled
- mixed Chronica/unstructured selection rejection
- Scabard regression coverage

## Risks And Mitigations

- **Fixture gap**: issue comments reference fixture files missing in this checkout. Mitigation: make fixture reconciliation Phase 0 and do not implement parser behavior against undocumented assumptions.
- **Partial imports hide missing links**: accepting partial domain sets may surprise users. Mitigation: preserve missing targets as unresolved references and surface them in the report.
- **Chronica HTML may need sanitization later**: first pass preserves authored content mechanically. Mitigation: keep raw and converted content paths explicit in metadata/tests.
- **Domain mappings may outpace schema support**: quest, encounter, map, or creature types may not exist. Mitigation: deterministic note fallback with source metadata.
- **Importer modal complexity**: grouped deterministic intake can complicate the existing per-file loop. Mitigation: isolate grouped deterministic detection before Oracle processing.

## Recommended Next Step

Start with Phase 0 and Phase 1 only:

- reconcile the Chronica fixture directory
- define browser-neutral Chronica intake types
- implement detection and grouping tests

Those steps will prove the multi-file contract before any domain mapping or UI changes are attempted.
