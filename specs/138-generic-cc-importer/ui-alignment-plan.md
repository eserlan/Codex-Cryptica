# UI Alignment Plan: Generic CC Importer

## Purpose

Align the existing importer modal with the design goal of the generic CC import engine.

Use the Scabard importer as the case study for the first complete deterministic import flow in the app:

`Scabard JSON -> CCImportPackage -> prepare -> review -> commit -> report`

This plan assumes the existing modal shell is reusable, but the current Scabard path is not sufficient because it bypasses the generic CC engine and converts adapter output into the older Oracle review model.

## Design Goal

The app should support two import pipelines inside one importer surface:

- Oracle pipeline for unstructured files that need AI extraction
- CC pipeline for deterministic adapter packages such as Scabard

The modal shell can remain shared, but the review model and commit path must differ by pipeline.

For Scabard, the UI must become a real CC import session surface rather than a translation into `DiscoveredEntity[]`.

## Current Gap

The existing importer modal in [ImportSettings.svelte](../../apps/web/src/lib/components/settings/ImportSettings.svelte) is Oracle-first.

Current Scabard behavior:

- Detect Scabard JSON
- Call `parseScabardExport(...)`
- Convert the result into `DiscoveredEntity[]`
- Render the existing [ReviewList.svelte](../../apps/web/src/lib/features/importer/ReviewList.svelte)
- Save through the legacy vault import flow

That misses the core CC engine workflow already implemented in:

- [engine.ts](../../packages/importer/src/cc/engine.ts)
- [session.ts](../../packages/importer/src/cc/session.ts)

Specifically, the current UI does not expose:

- package validation warnings
- include or ignore decisions per item
- match decisions: `skip`, `update`, `create`
- relationship draft review and unresolved relationship reporting
- asset eligibility and skipped asset reasons
- import report output after commit

## Alignment Principles

This plan follows the project constitution and style guide:

- Library-first: keep validation, mapping, resolution, and reporting in `@codex/importer`
- Thin UI binding: app code should adapt the engine, not reimplement it
- TDD: add tests for the web binding and CC review interactions
- DI: use an injected `VaultWriter` binding
- Natural language: keep importer wording plain and direct
- User documentation: add help content when the UI ships
- Svelte 5 runes and Tailwind 4 semantic tokens only

## Target User Flow

### Scabard flow

1. User opens the existing importer modal.
2. User uploads a Scabard campaign export JSON file.
3. App detects the Scabard adapter format.
4. App parses the file with `parseScabardExport(...)`.
5. App runs `ImportEngine.prepare(...)`.
6. User reviews a `CCImportSession`.
7. User changes item decisions and match decisions as needed.
8. App commits the reviewed session through a web `VaultWriter` adapter.
9. User sees a structured import report.

### Review requirements

The review step must show:

- entity drafts
- resolved types
- match status against existing vault entities
- include or ignore state
- match action for existing entities
- warnings
- relationship drafts and resolved or unresolved status when available
- asset import eligibility

### Commit requirements

The commit result must show:

- entities created
- entities updated
- items skipped
- relationships created
- unresolved references
- failures
- asset import counts

## Proposed Architecture

### 1. Keep one modal shell, add two review modes

Retain the existing step-based modal container in [ImportSettings.svelte](../../apps/web/src/lib/components/settings/ImportSettings.svelte), but add an explicit import mode:

- `oracle`
- `cc`

This keeps the current uploader, progress shell, and completion framing while allowing different review and commit implementations.

Important: upload access must not be gated only by `oracle.isEnabled`. Deterministic CC imports must remain available without a Gemini key; only the Oracle analysis path should require Oracle setup.

### 2. Introduce a web `VaultWriter` adapter

Add a thin `VaultWriter` implementation in `apps/web` that adapts the existing vault store methods to the engine port.

Responsibilities:

- `createEntity`
- `updateEntity`
- `findBySourceRef`
- `appendConnection`
- `saveAsset`

This is the required seam between the generic engine and the app. The engine stays in `packages/importer`; the app only provides the binding.

The adapter contract must explicitly define:

- how `createEntity(...)` returns the created entity ID
- how ID collisions are handled when vault creation sanitizes or suffixes IDs
- how `discoverySource` is preserved on created entities
- how `findBySourceRef(...)` scans existing vault entities
- how `appendConnection(...)` maps to the existing one-directional connection API
- how `saveAsset(...)` maps imported asset bytes into vault assets

### 3. Replace the Scabard-to-Oracle translation

Remove the Scabard-specific `ccImportToDiscoveredEntities(...)` path from the CC flow.

Instead:

- parse Scabard JSON into `CCImportPackage`
- call `ImportEngine.prepare(...)`
- store the returned `CCImportSession`
- drive the UI from that session

This makes Scabard the first real consumer of the generic CC engine.

### 4. Add a dedicated CC review component

Create a new review component for CC imports instead of stretching the existing [ReviewList.svelte](../../apps/web/src/lib/features/importer/ReviewList.svelte) beyond its model.

Suggested file:

- `apps/web/src/lib/features/importer/CCImportReview.svelte`

Suggested layout:

- top summary band with source label, item counts, warning count
- primary list/table of entity drafts
- secondary sections for warnings, unresolved links, and assets
- footer actions for cancel and commit

Per-item controls:

- include checkbox
- title
- resolved type
- source reference preview
- match badge
- segmented action control for `skip`, `update`, `create` when matched

This should use existing design tokens and the repo's compact utility-first UI patterns, not a separate visual language.

### 5. Add a report view, not just a success state

The current importer ends with a generic success message. The CC flow needs a report view backed by the engine's import report.

Suggested file:

- `apps/web/src/lib/features/importer/CCImportReport.svelte`

The report should summarize:

- what changed
- what was skipped
- what could not be resolved
- what failed

This makes the deterministic importer auditable and aligned with the engine contract.

### 6. Preserve Oracle as a separate path

Do not collapse Oracle and CC data models into one review component.

Keep:

- `ReviewList.svelte` for `DiscoveredEntity[]`
- a separate CC review component for `CCImportSession`

Unify only the shell and visual language.

## Scabard Case Study Deliverables

Scabard should prove the entire deterministic path before additional adapters are wired to it.

Definition of done for the Scabard UI path:

- Scabard import uses `parseScabardExport(...)`
- parsed output goes into `ImportEngine.prepare(...)`
- UI renders a `CCImportSession`
- user can ignore drafts
- user can choose `skip`, `update`, or `create` for matches
- relationship drafts are visible during review
- unresolved relationships are visible in the report, and visible during review if the engine preview contract is extended first
- commit runs through the web `VaultWriter`
- report is shown after commit
- no Oracle or AI dependency is required for the Scabard path

## Implementation Plan

### Phase 0: Contract cleanup

Purpose: remove ambiguity before UI work starts.

1. Verify the current `CCImportSession` shape against the UI needs in this plan.
2. Decide whether unresolved relationship status must be computed before commit.
3. If pre-commit relationship status is required, update `ImportEngine.prepare(...)` and related tests so `PreviewRelationship` contains real resolved or unresolved annotations instead of placeholder status.
4. Confirm the import report fields needed by the UI are already available from `ImportEngine.commit(...)`.
5. Confirm no Scabard path requires Oracle, AI, network, or upload gating.

Exit criteria:

- the engine/session contract can support the planned review and report UI
- any engine contract gaps are captured as tasks before web component work begins

### Phase 1: Web binding

Purpose: connect the generic engine to the existing vault store without putting vault logic in the UI component.

1. Add a web `VaultWriter` adapter in `apps/web`.
2. Implement `findBySourceRef(...)` by exact match against existing entity `discoverySource`.
3. Implement `createEntity(...)` so it returns the actual created entity ID after any sanitization or collision handling.
4. Implement `updateEntity(...)` so it applies only the engine patch fields and preserves vault-only fields.
5. Implement `appendConnection(...)` through the existing one-directional vault connection API.
6. Implement `saveAsset(...)` or explicitly mark asset save as unsupported with reportable failures if no compatible vault asset API exists yet.
7. Add focused tests for each adapter method.
8. Add a Scabard-shaped adapter integration test covering create, match lookup, update, connection append, and source-ref preservation.

Exit criteria:

- `ImportEngine.prepare(...)` can detect existing entities through the adapter
- `ImportEngine.commit(...)` can create or update vault entities and append relationships through the adapter
- adapter tests cover success and at least one failure path

### Phase 2: Modal state split

Purpose: route deterministic imports into the CC engine while preserving the Oracle importer.

1. Add explicit import mode state to `ImportSettings.svelte`: `oracle` or `cc`.
2. Split upload availability from Oracle availability so the uploader remains accessible when Oracle is disabled.
3. Keep Oracle setup prompts only on the Oracle analysis path.
4. Detect Scabard JSON before starting Oracle parsing or analysis.
5. Route Scabard JSON into CC mode.
6. Parse Scabard JSON with `parseScabardExport(...)`.
7. Instantiate the web `VaultWriter` adapter and `ImportEngine`.
8. Run `ImportEngine.prepare(...)` and store the returned `CCImportSession`.
9. Send validation failures to the modal's rejected/error state with plain user-facing wording.
10. Keep all existing unstructured imports on the current Oracle flow.

Exit criteria:

- Scabard import reaches CC review without Oracle enabled
- non-Scabard unstructured files continue to use the existing Oracle flow
- invalid Scabard packages show actionable validation feedback

### Phase 3: CC review UI

Purpose: give users a real CC import session review, not the legacy Oracle entity checklist.

1. Create `apps/web/src/lib/features/importer/CCImportReview.svelte`.
2. Render source label, item count, warning count, match count, relationship count, and asset count.
3. Render entity draft rows with include checkbox, title, resolved type, source reference, match status, and warning indicators.
4. Bind include or ignore changes through `setItemDecision(...)`.
5. Bind matched item decisions through `setMatchDecision(...)` with `skip`, `update`, and `create` options.
6. Render package warnings in a secondary section.
7. Render relationship drafts and their resolved or unresolved status if available from Phase 0.
8. Render asset eligibility and skipped asset reasons.
9. Disable commit when there is no actionable selected work.
10. Add component tests for include or ignore, match decisions, warning display, asset display, and commit-disabled state.

Exit criteria:

- the review component is driven by `CCImportSession`
- no Scabard data is converted into `DiscoveredEntity[]`
- review tests cover success and negative paths

### Phase 4: Commit and report

Purpose: commit reviewed drafts through the engine and show an auditable outcome.

1. Add a CC commit handler in the modal.
2. Call `ImportEngine.commit(...)` with the reviewed session.
3. Store the returned `ImportReport`.
4. Create `apps/web/src/lib/features/importer/CCImportReport.svelte`.
5. Render created, updated, skipped, relationship, unresolved reference, asset, and failure counts.
6. Render failure details with source refs and stages.
7. Render unresolved references with from, to, type, and reason.
8. Keep the report visible until the user dismisses it.
9. Reset CC state only after the user dismisses the report or starts a new import.
10. Add tests for successful commit, partial failure, unresolved references, and dismiss/reset behavior.

Exit criteria:

- Scabard commit writes through the generic engine
- users can see what changed and what did not
- partial failures are visible and do not silently disappear

### Phase 5: Documentation

Purpose: satisfy the user documentation requirement for the new deterministic import flow.

1. Add user-facing help content in [help-content.ts](../../apps/web/src/lib/config/help-content.ts).
2. Explain deterministic imports in plain language, including review, update, skip, and unresolved links.
3. Add a `FeatureHint` if the final interaction model remains complex after implementation.
4. Add or update help-content tests.

Exit criteria:

- deterministic imports have a user-facing help entry
- docs use "Labels" instead of "Tags" for user-facing categorization language

### Phase 6: Final verification

Purpose: prove the Scabard case study and protect the existing Oracle importer.

1. Run focused importer package tests.
2. Run focused web tests for the adapter and CC review/report components.
3. Run `bun run lint`.
4. Run `bun run test`.
5. Manually smoke-test Scabard import with Oracle disabled.
6. Manually smoke-test one existing Oracle import path with Oracle enabled.

Exit criteria:

- automated tests pass
- Scabard works without Oracle
- existing Oracle importer behavior is not regressed

## Testing Strategy

Follow TDD and cover both success and negative paths.

Required coverage:

- Scabard file detection routes into CC mode
- `prepare(...)` failures render validation feedback
- include or ignore toggles update the session
- match decisions update the session
- commit produces a rendered report
- unresolved relationships are surfaced
- partial commit failures remain visible and do not silently disappear
- Scabard path works without Oracle enabled
- existing Oracle import flow remains usable

## Open Questions

- Should future deterministic adapters share the same upload affordance, or should the modal expose a format picker once more adapters exist?

## Recommended Next Step

Implement the Scabard path as the first complete CC import session in the existing modal.

That yields the smallest change that proves the architecture:

- reuse the modal shell
- add the web `VaultWriter`
- replace the Scabard translation layer with `prepare(...)`
- ship a dedicated CC review and report surface

Once that path works, additional deterministic adapters can plug into the same UI contract with minimal UI churn.
