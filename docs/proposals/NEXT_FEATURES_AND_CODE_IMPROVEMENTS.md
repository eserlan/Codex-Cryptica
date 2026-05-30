# Next Features And Code Improvements Proposal

> Status: Draft for discussion
> Scope: Product roadmap candidates, reliability work, and maintainability improvements after the scroll-wheel date picker effort

---

## Purpose

This proposal captures a practical next-step backlog for Codex Cryptica. It separates user-facing features from code improvements so roadmap planning can keep product value visible while still paying down the engineering work that protects local-first data, performance, and future feature delivery.

The intent is not to define one large project. Each item should become a focused Spec Kit feature, GitHub issue, or refactor PR with tests for both the expected path and at least one failure, cancellation, or negative path.

## Prioritization Criteria

Use these filters when choosing what to build next:

- **User impact**: Improves a common campaign authoring workflow or reduces data-loss risk.
- **Local-first fit**: Works without a server and keeps private campaign data on the user's device.
- **Implementation leverage**: Builds on existing stores, packages, and Svelte components instead of adding parallel systems.
- **Reviewability**: Can land in a small PR with clear behavior, tests, and docs.
- **Roadmap unlock**: Removes friction for later features such as chronology, vault portability, or Oracle workflows.

## Recommended Feature Backlog

### 1. Chronology Quality Pass (Implemented)

**Goal**: Finish the scroll-wheel date picker and make campaign chronology feel reliable across entity details, timeline views, and custom calendar settings.

**User value**:

- Faster date entry on desktop and touch devices.
- Better support for partial dates, custom named periods, and invalid-date repair.
- More confidence when editing campaign calendars after content already exists.

**Suggested scope**:

- Ship the reusable `TemporalPicker` and integrate it for `date`, `start_date`, and `end_date`.
- Add a compact read-only formatted date preview wherever temporal metadata is displayed.
- Add repair-state messaging for dates created against an older calendar revision.
- Update chronology help content with plain examples for partial dates, named anchors, and invalid saved values.

**Engineering notes**:

- Keep validation, formatting, snapshots, and repair decisions in `packages/chronology-engine`.
- Keep Svelte components focused on display, interaction, and user confirmation.
- Test engine behavior before UI behavior, then add component tests for keyboard and failure paths.

### 2. Vault Load/Save Confidence (Implemented)

**Goal**: Make vault folder operations more understandable, interrupt-safe, and observable without exposing implementation terminology.

**User value**:

- Clearer distinction between loading from a folder and saving to a folder.
- Less anxiety during vault switching, browser permission changes, and interrupted writes.
- Better recovery when a folder handle is unavailable or stale.

**Suggested scope**:

- Continue replacing user-facing "sync" language with directional `load` and `save` language.
- Add clearer status states for pending, saving, saved, failed, and needs-permission flows.
- Add a non-blocking save-drain timeout when switching vaults.
- Surface actionable recovery copy when OPFS or folder access fails.

**Engineering notes**:

- Prefer a thin vault-facing facade before deeper internal renames.
- Preserve compatibility aliases temporarily where call sites are still migrating.
- Add tests for successful save, permission failure, cancellation, and timeout behavior.

### 3. [FEAT] Bulk Editing And Organization Tools ([#930](https://github.com/eserlan/Codex-Cryptica/issues/930))

**Goal**: Improve large-vault workflows where users need to clean up many entities without repetitive detail-panel editing.

**User value**:

- Faster label/category cleanup.
- Easier campaign maintenance after imports or long writing sessions.
- Better control over large knowledge graphs.

**Suggested scope**:

- Multi-select entity actions for adding/removing labels, assigning categories, and archiving.
- A review queue for entities with missing titles, empty content, invalid dates, or broken links.
- Batch update confirmation with a clear summary before changes are applied.

**Engineering notes**:

- Add bulk event types instead of emitting hundreds of single-entity events.
- Ensure search indexing can process batch changes efficiently.
- Use existing entity-store boundaries and avoid adding one-off bulk mutation paths in components.

### 4. [FEAT] Oracle Workflow Reliability ([#931](https://github.com/eserlan/Codex-Cryptica/issues/931))

**Goal**: Make Oracle actions easier to trust by showing what will change and keeping execution recoverable.

**User value**:

- More predictable AI-assisted edits.
- Clearer review before generated changes affect vault content.
- Better control when users cancel or revise an Oracle action.

**Suggested scope**:

- Add action previews that summarize proposed entity changes before applying them.
- Add explicit cancellation and retry states for long-running Oracle tasks.
- Keep a local action history entry with prompt, affected entities, and result summary.

**Engineering notes**:

- Extend the decomposed Oracle managers under `apps/web/src/lib/stores/oracle/` rather than expanding the facade.
- Keep user API keys and generated context local.
- Test success, cancellation, provider error, and rejected-action paths.

### 5. [FEAT] Graph And Map Interaction Polish ([#932](https://github.com/eserlan/Codex-Cryptica/issues/932))

**Goal**: Improve graph readability and navigation for large campaigns without changing the core data model.

**User value**:

- Easier movement through dense relationship maps.
- Better focus when exploring a single entity or cluster.
- Less layout surprise after edits.

**Suggested scope**:

- Add saved graph view presets per vault.
- Improve focus mode handoff between graph selection and entity detail.
- Add layout stability safeguards after bulk updates or date/category edits.

**Engineering notes**:

- Prefer changes inside existing graph-engine and view orchestration boundaries.
- Keep visual state separate from entity data unless the user explicitly saves a view preset.
- Add tests around graph state transitions where practical, and use targeted browser checks for layout regressions.

### 6. [FEAT] Vault Portability And Round-Trip Confidence ([#941](https://github.com/eserlan/Codex-Cryptica/issues/941))

**Goal**: Let users move vaults between devices, share campaign drafts, and recover from corruption without losing fidelity.

**User value**:

- Ability to copy a vault to another machine or browser profile without going through filesystem sync.
- Confidence that exported `.zip`/folder snapshots can be re-imported with no field loss.
- A recovery path when IndexedDB is corrupted or a migration partially fails.

**Suggested scope**:

- Add an explicit "Export Vault" action that emits a deterministic folder snapshot (markdown + metadata + canvas/map blobs).
- Add an "Import Vault" action that validates schema before committing entities to the store.
- Add a checkpoint/snapshot mechanism before destructive IndexedDB migrations (see Code Improvement H, [#944](https://github.com/eserlan/Codex-Cryptica/issues/944)).
- Round-trip integration test: build entity with every schema field → export → re-import → assert deep-equal.

**Engineering notes**:

- Treat import as an untrusted source: parse, validate (Code Improvement H), then commit through the existing vault facade.
- Reuse the existing markdown serializer rather than introducing a parallel format.
- Add a recovery mode UI (read-only browse + selective restore) before exposing destructive import.

### 7. Context-Aware Entity Generation (Implemented)

**Goal**: Enable users to quickly AI-generate a new entity based on the current entity and its nearby first-degree graph neighbors.

**User value**:

- Branch campaign settings organically and grounded in existing lore.
- Save time formatting markdown descriptions by pre-structuring layout headings with vault theme templates.
- Seamless directed relationship connections (Source → New Entity) created automatically.

**Suggested scope**:

- Gather first-degree connected neighbors (Title, Type, relationship, content) for prompt grounding.
- Provide a guided configuration modal for Target Type selection (with "Surprise Me" fallback), adaptive relationship suggestions, and custom prompt guidelines.
- Allow editing drafted fields in a review screen before deliberate persist.

**Engineering notes**:

- Excluded GM-facing lore context from compiled prompt context during shared guest sessions.
- Tested prompt compilation, JSON serialization schemas, and validation logic.

## Recommended Code Improvement Backlog

### A. Event And Store Boundaries (Implemented)

**Problem**: Some workflows still rely on repeated single-entity events or duplicated async race checks.

**Proposal**:

- Add bulk events for batch entity changes.
- Extract common stale-operation checks in async vault flows.
- Keep constructor-based dependency injection for new services and managers.

**Payoff**:

- Lower indexing and rendering overhead for large vaults.
- Fewer race-condition mistakes during vault switching.
- Easier unit testing for cancellation paths.

### B. Save Queue Efficiency (Implemented)

**Problem**: Rapid content edits can enqueue repeated saves for the same entity.

**Proposal**:

- Add per-entity save debouncing.
- Ensure `waitForAllSaves()` flushes pending debounced saves before draining the queue.
- Add a bounded timeout for save draining during vault switches.

**Payoff**:

- Fewer redundant disk writes.
- More reliable vault switching.
- Better behavior in throttled browser tabs or permission edge cases.

### C. Search Indexing Performance (Implemented — [#933](https://github.com/eserlan/Codex-Cryptica/issues/933), [PR #939](https://github.com/eserlan/Codex-Cryptica/pull/939))

**Problem**: Cache-loaded and batch-update flows performed indexing serially with redundant worker calls.

**Implemented**:

- Resolved the search worker once per bulk operation — `rebuildFromEntities` no longer calls `ensureWorker()` separately ahead of `indexBatch`.
- Replaced the dual `addBatchProgressive`/`addBatch` pattern with a clean two-branch dispatch: context-present uses `addBatchProgressive`; context-absent uses `addBatch` only.
- `BATCH_UPDATED` now filters entities against `BATCH_UPDATED_SEARCH_FIELDS` (`title`, `aliases`, `content`, `tags`, `labels`, `lore`, `metadata`) before queueing index work. Entities whose patch touches none of those fields are skipped; entities with no patch entry are re-indexed conservatively.
- Five correctness issues surfaced by post-PR review were resolved: stuck `_status` after vault-switch in `saveToFolder`/`loadFromFolder`, missing `metadata` field coverage, unguarded `cleanupConflictFiles`, early mutation of `pendingRetryEntities` before failable await, and `isStale()` signal parameter made optional.
- Eight new tests cover batch-filter paths, non-progressive indexing, metadata re-index regression, and frozen-status regression.

**Payoff**:

- Faster vault load times.
- Better performance for bulk edits.
- Less unnecessary work on large campaigns.
- No permanent save/load spinner after rapid vault switching.

### D. [TECH] Test Coverage For Local-First Failure Modes ([#934](https://github.com/eserlan/Codex-Cryptica/issues/934))

**Problem**: The riskiest behavior is not the happy path; it is interruption, permission loss, stale vault handles, and invalid persisted state.

**Proposal**:

- Add focused tests for permission failure, aborted load, aborted save, stale vault switch, invalid calendar dates, and rejected numeric date input.
- Keep tests close to the package or store that owns the behavior.
- Use Playwright only where browser behavior cannot be covered by unit/component tests.

**Payoff**:

- Safer refactors.
- Less regression risk around user data.
- Clearer confidence before release.

### E. [TECH] Documentation And Naming Cleanup ([#935](https://github.com/eserlan/Codex-Cryptica/issues/935))

**Problem**: Older docs and internal names still mix "sync" language with directional load/save behavior.

**Proposal**:

- Update developer docs when code boundaries change.
- Keep user-facing docs plain and task-oriented.
- Avoid adding implementation-only refactors to the user-facing changelog.

**Payoff**:

- Easier onboarding for contributors.
- Less user confusion around vault operations.
- Changelog stays focused on visible improvements.

### F. [TECH] Entity Store Hot-Path Optimizations ([#942](https://github.com/eserlan/Codex-Cryptica/issues/942))

**Problem**: Several reactive paths in `apps/web/src/lib/stores/vault/` and adjacent services do work that scales with the whole vault when a much smaller delta would do. These show up as small UI hitches today but block scaling to multi-thousand-entity campaigns.

**Proposal**:

- Replace the wholesale `rebuildInboundMap()` derivation with delta updates from `EntityMutationService` — connections added/removed should patch the inbound map surgically instead of recomputing across all entities.
- Merge `labelIndex` and `labelCounts` into a single pass over entities to eliminate the per-entity `new Set(entity.labels)` allocation in the count loop.
- Replace the per-entity `cacheService.set()` loop during cold cache preload with a single `cacheService.bulkSet()` wrapped in one Dexie transaction.
- Build a title/alias → ID index at vault load and maintain it on mutation; replace the full-entity scan in `findExplicitSubject()` (context retrieval) and the "Available Records" fallback list with index lookups.
- Use the inbound-connection map to scope `deleteEntity` cleanup to actually-linked entities instead of scanning the whole vault.

**Payoff**:

- Faster cold start ("vault opening to interactive").
- Snappier reactive updates during bulk edits and connection changes.
- Oracle prompts no longer linearly slower as the vault grows.

### G. [TECH] God-File Decomposition: SearchService And P2P Boundary ([#943](https://github.com/eserlan/Codex-Cryptica/issues/943))

**Problem**: A few service classes have grown into multi-responsibility coordinators that make further work risky.

- `SearchService` (~900 lines) couples vault-lifecycle event handling, index persistence (load/save/clear), progress state, and the indexing pipeline in one class.
- `MapInteractionManager` and `VTTTokenManager` (~600 lines each) tangle canvas gestures, token drag state, pin editing, fog painting, and direct multi-store access.
- P2P guest/host services rely on `(message as any).payload` after type dispatch, so a malformed peer message can corrupt in-memory state with no early signal.

**Proposal**:

- Extract `SearchIndexLifecycle` (event subscriptions + vault routing) and `SearchProgressCoordinator` (dirty flag, retry state, listeners) from `SearchService`; keep the public class as a thin facade.
- Split map/token logic into `TokenDragHandler`, `TokenSelectionManager`, and a slimmed `MapInteractionManager` that only owns canvas gestures; inject narrow store adapters instead of full stores.
- Add a typed P2P envelope (`type P2PMessage<T extends MessageType> = { type: T; payload: PayloadFor<T> }`) plus per-message validators at ingest, replacing `as any` casts.

**Payoff**:

- Each piece becomes unit-testable without standing up a full vault or full peer session.
- Unblocks background/incremental indexing, mobile touch drag, and future P2P message versions.
- P2P desync bugs surface at ingest instead of as silent state corruption later.

### H. [TECH] Data Integrity At Trust Boundaries ([#944](https://github.com/eserlan/Codex-Cryptica/issues/944))

**Problem**: Several places treat external or recovered data as trusted: YAML frontmatter parsed during import, entity records read back from IndexedDB after a partial sync, and schema migrations that mutate data destructively without a rollback path.

**Proposal**:

- Add Zod (or similar) schema validation to `parseMarkdown()` so malformed or attacker-crafted YAML frontmatter is rejected with a clear error rather than silently producing a malformed `Entity`.
- Validate entities on read-back from IndexedDB; quarantine invalid records, log them, and degrade gracefully instead of letting `id: undefined` reach the graph and search index.
- Before bumping `DB_VERSION`, snapshot vault metadata to a timestamped record and add a `migration_log` store recording `{ version, timestamp, status, rollbackTo }`. Each new migration must include a reversibility test.
- Add explicit file-type/extension checks in `ImportSettings.svelte` before handing payloads to parsers.

**Payoff**:

- Recoverable behavior when a sync, migration, or import goes wrong.
- Foundation for the Vault Portability feature (Feature 6).
- Less risk that a future schema bump leaves vaults in an unrecoverable state.

### I. [TECH] AI/Oracle Surface Hardening ([#945](https://github.com/eserlan/Codex-Cryptica/issues/945))

**Problem**: The AI pipeline blends user-controlled content directly into LLM prompts, and the Cloudflare Worker proxy can echo Gemini error responses to logs. Offline/quota failures also surface as silent stuck spinners rather than actionable messages.

**Proposal**:

- Wrap user-provided content in delimiter tags (e.g. `<USER_ENTITY>…</USER_ENTITY>`) wherever it concatenates into a system prompt; add a regression test that asserts injection strings do not change system-instruction behavior.
- Replace `console.log/error` in the Oracle proxy with structured logging that redacts `system_instruction` and vault context; return generic error codes to the client instead of the raw upstream payload.
- Detect offline state and quota errors in Oracle/image flows, surface a typed error to the notification store, and show actionable copy ("Generation limit reached. Try again later.").
- Treat user-provided API keys as secret in transit: never log them, never include them in error responses.

**Payoff**:

- Lore content with adversarial phrasing no longer jailbreaks the model.
- No vault content leaks into Cloudflare logs on upstream errors.
- Users with flaky connectivity get a clear failure instead of a permanent spinner.

### J. [TECH] CI, Build, And Lint Hygiene ([#946](https://github.com/eserlan/Codex-Cryptica/issues/946))

**Problem**: CI runs lint, tests, and build, but does not run type-checking standalone, has no bundle-size signal, runs E2E only on a nightly cron, and accumulates `@ts-expect-error` / Svelte-rule warnings that drift over time.

**Proposal**:

- Add `bun run lint:types` as its own CI step on PRs so a broken type change is visible as a status check, not buried in build logs.
- Run a smoke subset of E2E on PR (post-staging-deploy or against the preview deploy) and keep the nightly run as the full regression suite. Comment results back to the PR.
- Wire `rollup-plugin-visualizer` into `apps/web/vite.config.ts` and set `build.chunkSizeWarningLimit`; surface size deltas in PR.
- Escalate the six relaxed Svelte lint rules from `warn` to `error` incrementally (audit the existing `@ts-expect-error` / `@ts-ignore` suppressions first; fix two or three per sprint).
- Add a Dependabot config for minor/patch updates and a monthly major-version review window.

**Payoff**:

- Type and bundle regressions caught at merge time.
- Real UI breakage detected before staging, not the morning after.
- Lint-debt drift stops, dependency drift slows.

### K. [TECH] UX Safety Polish: Focus, Errors, And Unsaved Edits ([#947](https://github.com/eserlan/Codex-Cryptica/issues/947))

**Problem**: A handful of small UX/safety gaps undermine confidence in otherwise-solid flows: image-upload and import errors still call `alert()`, modals do not trap focus or restore it on close, the entity detail panel discards unsaved edits silently when the user navigates away, and empty states are inconsistent across views.

**Proposal**:

- Replace the remaining `alert()` calls (`DetailImage`, `ImportSettings`, `FrontPage`) with `notificationStore.notify(message, "error")` and add actionable copy.
- Add `inert` on background page content when a modal is open, trap Tab/Shift-Tab inside the modal, and return focus to the trigger element on close.
- Guard unsaved entity-detail edits with a confirmation dialog when the user clicks another entity, closes the panel, or navigates away; mark dirty form fields visually.
- Standardize empty states behind a shared `EmptyState.svelte` component with icon + headline + CTA; apply to entity list, graph, and oracle chat.

**Payoff**:

- Unified, non-blocking error UX.
- WCAG 2.1 AA dialog-focus compliance.
- Fewer "I lost my edits" moments in the primary authoring surface.
- Clearer onboarding for new vaults.

### L. [TECH] Targeted Test Coverage For Risky, Stateful Surfaces ([#948](https://github.com/eserlan/Codex-Cryptica/issues/948))

**Problem**: A few high-risk surfaces still have minimal coverage relative to their complexity, particularly the file-sync conflict engine and the vault round-trip path.

**Proposal**:

- Add parameterized unit tests for `SyncActionExecutor` covering every action type (match-initial, conflict-handle, abort propagation, hash mismatch, deleted-locally/modified-remotely).
- Add a vault round-trip integration test: build an entity with every schema field, serialize via `writeEntityFile`, re-parse via `parseMarkdown`, assert deep equality.
- Add property-based tests to `chronology-engine` for custom calendar mutations (changing months/weeks mid-session, leap-year edges across non-Gregorian configs, cache coherency after a calendar swap).
- Cover the proposer-store IndexedDB upgrade path with a faux-DB test, including a blocked-write during upgrade and concurrent reads.

**Payoff**:

- Catches the bugs E2E cannot isolate.
- Direct prerequisite for confident Vault Portability work (Feature 6).
- Higher confidence in calendar edits and proposer schema bumps.

## Suggested Delivery Order

1. [IMPLEMENTED] Finish and verify the scroll-wheel date picker feature.
2. [IMPLEMENTED] Land vault load/save reliability improvements that reduce data-loss and switching risk.
3. [IMPLEMENTED] Fix search indexing performance and correctness (batch filtering, frozen status, metadata coverage). ([#933](https://github.com/eserlan/Codex-Cryptica/issues/933), [PR #939](https://github.com/eserlan/Codex-Cryptica/pull/939))
4. [TECH] Entity store hot-path optimizations (Code Improvement F, [#942](https://github.com/eserlan/Codex-Cryptica/issues/942)) — small, mostly self-contained, unblocks bulk editing work.
5. [TECH] Data integrity at trust boundaries (Code Improvement H, [#944](https://github.com/eserlan/Codex-Cryptica/issues/944)) — prerequisite for safe vault portability and AI-driven edits.
6. [FEAT] Add bulk entity operations with batch event/indexing support. ([#930](https://github.com/eserlan/Codex-Cryptica/issues/930))
7. [TECH] AI/Oracle surface hardening (Code Improvement I, [#945](https://github.com/eserlan/Codex-Cryptica/issues/945)) — pair with Feature 4 work.
8. [FEAT] Improve Oracle action preview, cancellation, and retry flows. ([#931](https://github.com/eserlan/Codex-Cryptica/issues/931))
9. [FEAT] Vault portability and round-trip confidence (Feature 6, [#941](https://github.com/eserlan/Codex-Cryptica/issues/941)) — depends on H and L.
10. [FEAT] Polish graph/map navigation and saved view state. ([#932](https://github.com/eserlan/Codex-Cryptica/issues/932))

Cross-cutting tracks should run alongside feature work rather than wait for a single milestone:

- Code Improvement G — God-file decomposition ([#943](https://github.com/eserlan/Codex-Cryptica/issues/943))
- Code Improvement J — CI, build, and lint hygiene ([#946](https://github.com/eserlan/Codex-Cryptica/issues/946))
- Code Improvement K — UX safety polish ([#947](https://github.com/eserlan/Codex-Cryptica/issues/947))
- Code Improvement L — Targeted test coverage ([#948](https://github.com/eserlan/Codex-Cryptica/issues/948))

## Spec Kit Follow-Up Candidates

- `chronology-quality-pass`: complete picker integration, formatted previews, and repair documentation.
- `vault-load-save-confidence`: status language, permission recovery, save-drain timeout, and tests.
- `bulk-entity-operations`: multi-select actions, batch events, and search indexing updates.
- `oracle-action-preview`: preview, confirm, cancel, retry, and local action history.
- `graph-view-presets`: saved visual graph states and focus-mode polish.
- `vault-portability`: export, import, round-trip validation, and recovery mode.
- `entity-store-perf`: delta inbound map, bulk Dexie cache, title index, and label-pass merge.
- `trust-boundary-validation`: YAML frontmatter validation, IndexedDB read-back validation, migration snapshots.
- `oracle-hardening`: prompt delimiters, proxy log redaction, offline/quota failure surfaces.
- `ci-quality-gates`: typecheck job, PR E2E smoke, bundle visualizer, Dependabot, Svelte lint escalation.
- `ux-safety-polish`: alert → notification migration, modal focus traps, unsaved-edit guard, shared empty state.

## Open Questions

- Should bulk editing ship before Oracle action previews, or should Oracle previews land first because they reduce AI-edit risk?
- Should saved graph view presets be vault-local only, or should they be portable with exported vault data?
- Which vault failure states are currently most common for users: permission loss, interrupted save, stale folder handle, or browser storage limits?
- Should chronology repair states appear only in the picker, or should entity lists also flag dates that need review?
- For trust-boundary validation (Code Improvement H), should invalid records be quarantined silently or surfaced to the user with a recovery prompt?
- Should the AI prompt-injection guardrails be visible to users (e.g., "AI safety preprocessing applied") or stay an invisible defense?
