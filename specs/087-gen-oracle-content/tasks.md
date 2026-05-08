# Tasks: Auto-generate Content from Oracle Chat

**Feature Branch**: `087-gen-oracle-content`
**Status**: In Progress
**Plan**: [/workspaces/Codex-Cryptica/specs/087-gen-oracle-content/plan.md]

## Phase 0: Foundation & Schema [P]

- [x] **T001**: Extend `Entity` schema in `packages/schema` with `status` (`active | draft`), `discoverySource`, and `lastUpdated`.
- [x] **T002**: Add `DiscoveryProposal` and `PendingDraft` types to `packages/schema` or `packages/oracle-engine/src/types.ts`.
- [x] **T003**: Implement draft status support in `packages/vault-engine` (filtering and persistence).

## Phase 1: Engine Logic (Oracle Engine) [P]

- [x] **T004**: Create `DraftingEngine` service in `packages/oracle-engine` following the `IDraftingEngine` contract.
- [x] **T005**: Implement entity extraction logic in `DraftingEngine` using natural language markers and fuzzy matching fallback.
- [x] **T006**: Integrate `DraftingEngine` into `OracleActionExecutor` to run on every response.
- [x] **T007**: Update `system-instructions.ts` to guide the Oracle toward using structured entity markers.

## Phase 2: UI & Experience (Web App)

- [x] **T008**: Create `DiscoveryChip.svelte` component for displaying proactive findings.
- [x] **T009**: Integrate `DiscoveryChip` into `ChatMessage.svelte` to show "Found: [Name]" actions.
- [x] **T010**: Implement "Auto-Archive" toggle in settings and link it to the Oracle store logic.
- [x] **T011**: Implement `SessionActivityService` to record discovery events and auto-archived actions.
- [x] **T012**: Create `ActivityLog.svelte` component to display the persistent session activity feed.
- [x] **T013**: Add "Review" tab/filter to the Entity Explorer for managing unreviewed drafts.
- [x] **T014**: Add "Ghost" styling for draft nodes in `packages/graph-engine` (or wherever node styles are defined).

## Phase 3: Validation & Documentation

- [x] **T015**: Write unit tests for `DraftingEngine` (accuracy and latency).
- [x] **T016**: Implement E2E tests for the proactive discovery, "One-Click Commit", and Auto-Archive flows.
- [x] **T017**: Measure and report entity identification accuracy (SC-001) and update precision (SC-004) via benchmark suite.
- [x] **T018**: Add guide entries to `apps/web/src/lib/config/help-content.ts` covering Auto-Archive, Review tab, and Ghost nodes.

## Phase 4: Automation Policy Controls

- [ ] **T019**: Add an `OracleAutomationPolicy` preference with separate `entityDiscovery` and `connectionDiscovery` modes.
- [ ] **T020**: Expose Entity Discovery (`Off | Suggest | Auto-create`) and Connection Discovery (`Off | Suggest | Auto-apply`) controls in Oracle settings with clear explanatory labels.
- [ ] **T021**: Update normal chat extraction so `entityDiscovery: off` suppresses discovery output and `entityDiscovery: suggest` never persists records without explicit user action.
- [ ] **T022**: Update Auto-Archive behavior so automatic entity persistence only runs when `entityDiscovery: auto-create`.
- [ ] **T023**: Update manual discovery-chip create/update and deterministic `/create` so follow-up connection handling respects `connectionDiscovery`.
- [ ] **T024**: Ensure `connectionDiscovery: suggest` seeds Feature 040 proposals without creating graph edges.
- [ ] **T025**: Ensure `connectionDiscovery: auto-apply` applies only eligible proposer results and reports the created edge count through user feedback and the activity log.
- [ ] **T026**: Add unit tests for all automation policy branches across the Oracle store, discovery chip, and Oracle executor.
- [ ] **T027**: Update help content and feature hints to explain Oracle automation levels and the difference between suggestions and automatic graph changes.
- [ ] **T028**: Collapse suggestion-mode discovery chips behind a compact "Found lore" control with a proposal count.
- [ ] **T029**: Suppress structured output labels (`Name`, `Type`, `Chronicle`, `Lore`, `Content`, `Summary`) from Drafting Engine proposals.
- [ ] **T030**: Add tests covering collapsed discovery UI and structured-label suppression.
