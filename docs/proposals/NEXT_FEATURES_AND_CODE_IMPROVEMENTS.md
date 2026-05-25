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

### 1. Chronology Quality Pass

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

### 2. Vault Load/Save Confidence

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

### 3. Bulk Editing And Organization Tools

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

### 4. Oracle Workflow Reliability

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

### 5. Graph And Map Interaction Polish

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

## Recommended Code Improvement Backlog

### A. Event And Store Boundaries

**Problem**: Some workflows still rely on repeated single-entity events or duplicated async race checks.

**Proposal**:

- Add bulk events for batch entity changes.
- Extract common stale-operation checks in async vault flows.
- Keep constructor-based dependency injection for new services and managers.

**Payoff**:

- Lower indexing and rendering overhead for large vaults.
- Fewer race-condition mistakes during vault switching.
- Easier unit testing for cancellation paths.

### B. Save Queue Efficiency

**Problem**: Rapid content edits can enqueue repeated saves for the same entity.

**Proposal**:

- Add per-entity save debouncing.
- Ensure `waitForAllSaves()` flushes pending debounced saves before draining the queue.
- Add a bounded timeout for save draining during vault switches.

**Payoff**:

- Fewer redundant disk writes.
- More reliable vault switching.
- Better behavior in throttled browser tabs or permission edge cases.

### C. Search Indexing Performance

**Problem**: Cache-loaded and batch-update flows can perform indexing serially.

**Proposal**:

- Resolve search services once for bulk operations.
- Add batch indexing paths where the underlying search service supports it.
- Avoid re-indexing unchanged content during metadata-only edits when possible.

**Payoff**:

- Faster vault load times.
- Better performance for bulk edits.
- Less unnecessary work on large campaigns.

### D. Test Coverage For Local-First Failure Modes

**Problem**: The riskiest behavior is not the happy path; it is interruption, permission loss, stale vault handles, and invalid persisted state.

**Proposal**:

- Add focused tests for permission failure, aborted load, aborted save, stale vault switch, invalid calendar dates, and rejected numeric date input.
- Keep tests close to the package or store that owns the behavior.
- Use Playwright only where browser behavior cannot be covered by unit/component tests.

**Payoff**:

- Safer refactors.
- Less regression risk around user data.
- Clearer confidence before release.

### E. Documentation And Naming Cleanup

**Problem**: Older docs and internal names still mix "sync" language with directional load/save behavior.

**Proposal**:

- Update developer docs when code boundaries change.
- Keep user-facing docs plain and task-oriented.
- Avoid adding implementation-only refactors to the user-facing changelog.

**Payoff**:

- Easier onboarding for contributors.
- Less user confusion around vault operations.
- Changelog stays focused on visible improvements.

## Suggested Delivery Order

1. Finish and verify the scroll-wheel date picker feature.
2. Land vault load/save reliability improvements that reduce data-loss and switching risk.
3. Add bulk entity operations with batch event/indexing support.
4. Improve Oracle action preview, cancellation, and retry flows.
5. Polish graph/map navigation and saved view state.

This order keeps the active chronology work moving, then addresses the highest-risk local-first data paths before adding broader workflow features.

## Spec Kit Follow-Up Candidates

- `chronology-quality-pass`: complete picker integration, formatted previews, and repair documentation.
- `vault-load-save-confidence`: status language, permission recovery, save-drain timeout, and tests.
- `bulk-entity-operations`: multi-select actions, batch events, and search indexing updates.
- `oracle-action-preview`: preview, confirm, cancel, retry, and local action history.
- `graph-view-presets`: saved visual graph states and focus-mode polish.

## Open Questions

- Should bulk editing ship before Oracle action previews, or should Oracle previews land first because they reduce AI-edit risk?
- Should saved graph view presets be vault-local only, or should they be portable with exported vault data?
- Which vault failure states are currently most common for users: permission loss, interrupted save, stale folder handle, or browser storage limits?
- Should chronology repair states appear only in the picker, or should entity lists also flag dates that need review?
