---
description: "Task list for 157-random-tables-decks"
---

# Tasks: Random Roll Tables and Custom Card Decks

**Input**: Design documents from `/specs/157-random-tables-decks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included throughout. Constitution II makes TDD
mandatory ("no code logic shall be committed without corresponding unit tests"),
so tests are not optional for this feature. Write them first and confirm they
fail before implementing.

**Organization**: Grouped by user story so each ships independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task serves (US1–US6)
- Exact file paths are given in every task

## Path Conventions

Workspace package at `packages/random-source-engine/`, UI in `apps/web/src/lib/`,
Oracle integration in `packages/oracle-engine/src/`, per plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new workspace package

- [ ] T001 Create `packages/random-source-engine/package.json` mirroring `packages/dice-engine/package.json` (name `random-source-engine`, private, `main`/`types` → `./src/index.ts`, scripts `test`/`test:coverage`/`lint`), with a workspace dependency on `dice-engine`
- [ ] T002 [P] Create `packages/random-source-engine/tsconfig.json` copied from `packages/dice-engine/tsconfig.json`
- [ ] T003 [P] Create `packages/random-source-engine/vitest.config.ts` from the `dice-engine` config, keeping the 70/60/60/70 coverage thresholds required for new packages (Constitution X)
- [ ] T004 [P] Create `packages/random-source-engine/bunfig.toml` matching `packages/dice-engine/bunfig.toml`
- [ ] T005 Create `packages/random-source-engine/src/index.ts` re-exporting `./types` (barrel grows as modules land)
- [ ] T006 Run `bun install` from the repo root so the workspace picks up the new package, then confirm `bun run test --filter random-source-engine` executes (zero tests is a pass)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared content model and the randomness seam every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Define all core types in `packages/random-source-engine/src/types.ts` per data-model.md: `RandomSource`, `SelectionMode`, `TableEntry`, `Card`, `DeckOptions`, `DeckState`, `Spread`, `Reference`, `ResolutionNode`, `RollOutcome`, `Notice`, `Diagnostic`, `DieSpec`, `Range`
- [ ] T008 Export `MAX_RESOLUTION_DEPTH = 8` from `packages/random-source-engine/src/types.ts` (R8)
- [ ] T009 [P] Write failing tests in `packages/random-source-engine/tests/selection.test.ts` for weighted index selection: equal weights spread across the full range, a weight of 3 chosen ~3× as often as 1 over 1,000 draws with a seeded provider (SC-008), and single-entry tables always returning index 0
- [ ] T010 Implement `selectIndex(weights: number[], dice: DiceEngine): number` in `packages/random-source-engine/src/selection.ts`, delegating to `DiceEngine` — never `Math.random()` (R1)
- [ ] T011 [P] Write failing tests in `packages/random-source-engine/tests/reference-parser.test.ts`: single reference, multiple references in one string, unclosed `{`, empty `{}`, nested braces, and correct `start`/`end` offsets
- [ ] T012 Implement `parseReferences(text: string): Reference[]` in `packages/random-source-engine/src/resolver.ts`, treating unmatched and empty braces as literal text (spec Assumptions)
- [ ] T013 [P] Write failing round-trip tests in `packages/random-source-engine/tests/parser.test.ts`: `parseRandomSource(serialiseRandomSource(x))` deep-equals `x` for a weighted table, a ranged table, and a deck
- [ ] T014 Implement `parseRandomSource` / `serialiseRandomSource` in `packages/random-source-engine/src/parser.ts` using the YAML-frontmatter-plus-Markdown-body shape in data-model.md
- [ ] T015 Add a deterministic `CryptoProvider` test helper in `packages/random-source-engine/tests/helpers/seeded-crypto.ts` so every distribution and cycle test is reproducible

**Checkpoint**: Content model, randomness, reference parsing, and file round-trip are in place — user stories can begin

---

## Phase 3: User Story 1 - Author and roll a simple table (Priority: P1) 🎯 MVP

**Goal**: A GM can create a weighted table, roll it, see the die value, and find the roll in history.

**Independent Test**: Create a table with several entries, roll it repeatedly, confirm results honour weights, the die value shows, and each roll lands in roll history.

### Tests for User Story 1 ⚠️

- [ ] T016 [P] [US1] Write failing tests in `packages/random-source-engine/tests/engine.roll.test.ts`: rolling returns exactly one entry, the reported `dieValue` matches the selected entry, and a single-entry table always returns that entry
- [ ] T017 [P] [US1] Write failing tests in `packages/random-source-engine/tests/validation.test.ts`: duplicate name is `severity: "error"`, range gaps/overlaps/unreachable entries are `severity: "warning"`, and an empty table is reported rather than thrown
- [ ] T018 [P] [US1] Write failing tests in `packages/random-source-engine/tests/mode-conversion.test.ts` for FR-004a: weighted→ranged produces contiguous ranges of width equal to each weight, ranged→weighted produces weights equal to range widths, and both directions round-trip

### Implementation for User Story 1

- [ ] T019 [US1] Implement `RandomSourceEngine.roll()` in `packages/random-source-engine/src/engine.ts` for flat tables (no reference resolution yet), returning `RollOutcome` with a single-node `chain`
- [ ] T020 [US1] Implement `validateSource()` in `packages/random-source-engine/src/validation.ts` producing `Diagnostic[]`; only `duplicate-name` is an error, every coverage finding is a warning (FR-006 must not block save)
- [ ] T021 [US1] Implement weighted↔ranged conversion in `packages/random-source-engine/src/mode-conversion.ts` (FR-004a)
- [ ] T022 [US1] Export engine, validation, and conversion from `packages/random-source-engine/src/index.ts`
- [ ] T023 [US1] Create `apps/web/src/lib/stores/random-source-store.svelte.ts`: vault-backed CRUD over `_tables/` and `_decks/`, name-uniqueness enforcement (FR-003a), constructor-injected vault dependency with a production default (Constitution VIII)
- [ ] T024 [P] [US1] Write failing tests in `apps/web/src/lib/stores/random-source-store.test.ts` covering create, rename, duplicate, delete, and rejection of a colliding name
- [ ] T025 [US1] Build `apps/web/src/lib/components/random/TableEditor.svelte` — name, labels, entry list with add/edit/reorder/delete, mode toggle, inline diagnostics from `validateSource`
- [ ] T026 [US1] Virtualise the entry list in `TableEditor.svelte` so a 1,000-entry table stays inside the frame budget (SC-004, R7)
- [ ] T027 [US1] Build `apps/web/src/lib/components/random/TableRoller.svelte` showing the result, the die value, and a re-roll control
- [ ] T028 [US1] Extend `ContextualRollResult` in `apps/web/src/lib/stores/dice-history.svelte.ts` with an optional `source: RandomSourceRollPayload` and widen `context` to `"chat" | "modal" | "table"` (R6 — additive, no IndexedDB version bump)
- [ ] T029 [US1] Write the roll through to `DiceHistoryStore.addResult` from `TableRoller.svelte` (FR-018)
- [ ] T030 [P] [US1] Update `apps/web/src/lib/components/dice/RollLog.svelte` to render a table-sourced entry (source name, die value, result text)
- [ ] T031 [US1] Add the `/tables` route in `apps/web/src/routes/(app)/tables/+page.svelte` with a searchable, label-filterable list (FR-003, FR-009)
- [ ] T032 [P] [US1] Add a Playwright spec `apps/web/tests/random-tables.spec.ts` covering create → add entries → roll → verify history, following the shape of `apps/web/tests/dice-roll.spec.ts`
- [ ] T033 [US1] Verify offline behaviour: roll with the network disconnected and confirm no request is issued (FR-020, SC-005)

**Checkpoint**: US1 is a shippable MVP — a GM can author and roll a table tonight

---

## Phase 4: User Story 2 - Nested tables and composed results (Priority: P1)

**Goal**: Entries containing `{creature}` resolve against other sources into one composed sentence, with the contributing chain visible.

**Independent Test**: Create three tables where one references the other two, roll the parent, confirm one composed result with every reference resolved and each sub-roll visible.

### Tests for User Story 2 ⚠️

- [ ] T034 [P] [US2] Write failing tests in `packages/random-source-engine/tests/resolver.test.ts`: single reference resolves, multiple references in one entry all resolve into continuous text, and the chain records which source produced each fragment (SC-009)
- [ ] T035 [P] [US2] Write failing tests in `packages/random-source-engine/tests/resolver.cycles.test.ts`: direct self-reference and an A→B→A loop both terminate with `status: "cycle"`, a usable result, and a notice — never a throw or a hang (FR-014, SC-006)
- [ ] T036 [P] [US2] Write failing tests in `packages/random-source-engine/tests/resolver.depth.test.ts`: a chain deeper than `MAX_RESOLUTION_DEPTH` stops with `status: "depth-limit"` and a _different_ notice from the cycle case (FR-015, R8)
- [ ] T037 [P] [US2] Write failing tests in `packages/random-source-engine/tests/resolver.unresolved.test.ts`: a reference to a missing or deleted source is preserved visibly with `status: "unresolved"` and never replaced with empty text (FR-016)

### Implementation for User Story 2

- [ ] T038 [US2] Implement recursive resolution in `packages/random-source-engine/src/resolver.ts` with a visited-set on the resolution path for cycles and a separate depth counter, so the two failures report distinctly (R8)
- [ ] T039 [US2] Build the `ResolutionNode` tree during resolution and attach it to `RollOutcome.chain`
- [ ] T040 [US2] Wire `RandomSourceEngine.roll()` to the resolver and accept a `ResolutionContext` with case-insensitive name `lookup` (clarification 1)
- [ ] T041 [US2] Implement `RandomSourceEngine.rollMany()` for multi-table rolls presented as one outcome (FR-017)
- [ ] T042 [US2] Implement `RandomSourceEngine.rerollFragment(outcome, nodePath, ctx)` re-resolving one node while leaving siblings intact (FR-019)
- [ ] T043 [US2] Build `apps/web/src/lib/components/random/ResolutionChain.svelte` showing which source produced each fragment, inline in the result view (SC-009)
- [ ] T044 [US2] Add per-fragment re-roll controls to `TableRoller.svelte` wired to `rerollFragment`
- [ ] T045 [US2] Render cycle, depth-limit, and unresolved notices in `TableRoller.svelte` as plain-language messages (Constitution IX)
- [ ] T046 [US2] Persist the full chain into history via the `source.chain` payload (FR-018)
- [ ] T047 [US2] Highlight references and flag malformed brace syntax inline in `TableEditor.svelte` (Edge Cases: malformed reference syntax)
- [ ] T048 [US2] Implement rename/delete impact reporting in `random-source-store.svelte.ts`: warn and list referencing sources before proceeding (FR-042)
- [ ] T049 [P] [US2] Extend `apps/web/tests/random-tables.spec.ts` with a nested-resolution journey including a deliberately cyclic table

**Checkpoint**: US1 + US2 deliver the complete table system the original request asked for

---

## Phase 5: User Story 3 - Import tables in bulk (Priority: P2)

**Goal**: Paste a spreadsheet, PDF excerpt, or Markdown table and get a rollable table in under a minute.

**Independent Test**: Paste content in each supported format, confirm the preview reads rows and ranges correctly, adjust the mapping, save, and roll the result.

### Tests for User Story 3 ⚠️

- [ ] T050 [P] [US3] Write failing tests in `packages/random-source-engine/tests/import/lines.test.ts`: one entry per line, blank lines skipped, all equal weight, producing weighted mode (FR-031)
- [ ] T051 [P] [US3] Write failing tests in `packages/random-source-engine/tests/import/delimited.test.ts`: comma- and tab-separated input, a range column producing ranged mode, a weight column producing weighted mode (FR-032)
- [ ] T052 [P] [US3] Write failing tests in `packages/random-source-engine/tests/import/markdown-table.test.ts`: header row recognised, data rows become entries, alignment rows ignored (FR-033)
- [ ] T053 [P] [US3] Write failing tests in `packages/random-source-engine/tests/import/detect.test.ts` for `detectFormat` across all three shapes plus ambiguous input
- [ ] T054 [P] [US3] Write failing tests asserting a batch containing unparseable rows still returns a preview, with `problem` set per bad row and good rows intact (FR-035)

### Implementation for User Story 3

- [ ] T055 [P] [US3] Implement `packages/random-source-engine/src/import/lines.ts`
- [ ] T056 [P] [US3] Implement `packages/random-source-engine/src/import/delimited.ts`
- [ ] T057 [P] [US3] Implement `packages/random-source-engine/src/import/markdown-table.ts`
- [ ] T058 [US3] Implement `detectFormat` and `parseImport` in `packages/random-source-engine/src/import/detect.ts` returning `ImportPreview` per the contract
- [ ] T059 [US3] Build `apps/web/src/lib/components/random/ImportWizard.svelte`: paste → preview → correct column mapping → save (FR-034)
- [ ] T060 [US3] Show per-row problems in the preview with fix / skip / accept actions that never abandon the batch (FR-035)
- [ ] T061 [US3] Add the name-collision prompt offering replace, merge, or save-as-new (FR-037)
- [ ] T062 [P] [US3] Add a Playwright spec `apps/web/tests/random-tables-import.spec.ts` importing a 100-row d100 table and rolling it (SC-002)

**Checkpoint**: Adoption path is complete — users can bring tables they already own

---

## Phase 6: User Story 4 - Card decks with a persistent discard pile (Priority: P2)

**Goal**: Draw without replacement, with the discard pile surviving restarts and travelling with the vault.

**Independent Test**: Create a deck, draw until several cards are gone, reload, confirm the discard pile survived; reset and confirm the full deck returns.

### Tests for User Story 4 ⚠️

- [ ] T063 [P] [US4] Write failing tests in `packages/random-source-engine/tests/deck-state.test.ts`: a missing state file reads as a full deck with an empty discard pile, `drawn` accumulates across draws, and reset clears it (FR-024, FR-025)
- [ ] T064 [P] [US4] Write failing tests in `packages/random-source-engine/tests/deck-service.test.ts`: draw without replacement never repeats a card, two back-to-back draws never collide (Edge Cases: concurrent draws), draw with replacement may repeat and leaves the pile untouched
- [ ] T065 [P] [US4] Write a failing test asserting card ids in `drawn` that no longer exist in the deck are ignored on read and pruned on the next write (data-model invariant)
- [ ] T066 [P] [US4] Write failing tests for exhaustion: drawing from an empty deck returns `exhausted: true` with no partial mutation, and reset restores every card (FR-026, FR-025)

### Implementation for User Story 4

- [ ] T067 [US4] Implement deck state read/derive helpers in `packages/random-source-engine/src/deck-state.ts` per data-model.md: remaining = cards minus `drawn`, absent file means untouched deck
- [ ] T068 [US4] Define the `DeckStateStore` interface and implement `DeckService` (`draw`, `reset`, `remaining`) in `packages/random-source-engine/src/deck-service.ts`, serialising writes so concurrent draws cannot collide
- [ ] T069 [US4] Implement `apps/web/src/lib/stores/deck-state-store.ts` over `_decks/<slug>/state.json`, serialising writes so two rapid draws cannot interleave
- [ ] T070 [US4] Prune card ids from `drawn` that no longer exist in the deck when writing state, so deleting a card cannot corrupt the discard pile
- [ ] T071 [US4] Build `apps/web/src/lib/components/random/CardEditor.svelte` for title, body, and draw-mode options
- [ ] T072 [US4] Build `apps/web/src/lib/components/random/DeckView.svelte`: draw one or many, remaining count, discard pile, shuffle/reset, exhaustion prompt offering a reshuffle
- [ ] T073 [US4] Record draws in history with drawn card ids and titles (FR-029)
- [ ] T074 [US4] Ensure `Card.id` is assigned once at creation and preserved through edit and re-import — regenerating ids would silently reset every deck (quickstart gotchas)
- [ ] T075 [P] [US4] Add a Playwright spec `apps/web/tests/random-decks.spec.ts` covering draw → reload → discard pile intact → reset → full deck (SC-007)

**Checkpoint**: Decks work standalone, and deck state is sync-safe by construction

---

## Phase 7: User Story 5 - Rich card decks: images, reversals, and spreads (Priority: P3)

**Goal**: Oracle and Tarot-style decks with artwork, dual meanings, and named-position spreads.

**Independent Test**: Bulk-import a deck with images and dual meanings, draw a named spread, confirm each position shows the right card, orientation, and meaning.

### Tests for User Story 5 ⚠️

- [ ] T076 [P] [US5] Write failing tests in `packages/random-source-engine/tests/deck-service.reversals.test.ts`: reversal-enabled decks assign an orientation and surface the matching meaning; reversal-disabled decks show no orientation (FR-027)
- [ ] T077 [P] [US5] Write failing tests in `packages/random-source-engine/tests/deck-service.spreads.test.ts`: each position gets exactly one card, and a spread larger than the remaining deck warns _before_ dealing anything (FR-028, US5 scenario 5)

### Implementation for User Story 5

- [ ] T078 [US5] Implement reversal orientation in `deck-service.ts`, drawn through `DiceEngine` rather than `Math.random()`
- [ ] T079 [US5] Implement `drawSpread()` with a capacity pre-check so no partial spread is ever dealt
- [ ] T080 [US5] Add spread definition UI to `DeckView.svelte` (named, ordered positions)
- [ ] T081 [US5] Render spreads as a positional layout with each position label beside its card, not a flat list
- [ ] T082 [US5] Wire card images through `AssetManager` in `packages/vault-engine/src/asset-manager.ts`, inheriting its size limits and export behaviour
- [ ] T083 [US5] Extend `ImportWizard.svelte` to bulk-import cards with images, matching each image to its card (FR-036)
- [ ] T084 [US5] Handle storage exhaustion during image import: fail cleanly with a message, leaving the deck consistent rather than half-imported (Edge Cases)
- [ ] T085 [US5] Resolve `{reference}` tokens in card body text at draw time via `RandomSourceEngine` (FR-012)
- [ ] T086 [US5] Ensure a deck reached _through a reference_ is sampled with replacement and never depleted (FR-012a), with a test proving 20 fragment re-rolls leave the discard pile empty

**Checkpoint**: Oracle and Tarot decks are fully supported

---

## Phase 8: User Story 6 - Roll from anywhere mid-session (Priority: P3)

**Goal**: `/table <name>` and `/deck <name>` from the Oracle chat, with results inline.

**Independent Test**: Invoke a table by name from Oracle chat, confirm the result appears inline and in roll history, identical to rolling from the table's own view.

### Tests for User Story 6 ⚠️

- [ ] T087 [P] [US6] Write failing tests in `packages/oracle-engine/src/oracle-parser.test.ts` for `/table <name>` → `roll-table` and `/deck <name> [count]` → `draw-deck`, plus an assertion that `/draw` still routes to the visualization intent (R5)
- [ ] T088 [P] [US6] Write failing tests in `packages/oracle-engine/src/executors/random-source-executor.test.ts` covering a successful roll, a successful draw, and an unknown name returning close matches

### Implementation for User Story 6

- [ ] T089 [US6] Add `roll-table` and `draw-deck` to `OracleIntent` in `packages/oracle-engine/src/types.ts`
- [ ] T090 [US6] Parse `/table` and `/deck` in `packages/oracle-engine/src/oracle-parser.ts` — **not** `/draw`, which is already routed to `visualizationExecutor`
- [ ] T091 [US6] Create `packages/oracle-engine/src/executors/random-source-executor.ts` following the `dice-executor.ts` shape: extend `BaseExecutor`, emit `COMMAND_STARTED`/`COMPLETED`/`FAILED`, push a typed chat message, write to history
- [ ] T092 [US6] Route both intents in `packages/oracle-engine/src/oracle-executor.ts`
- [ ] T093 [US6] Return close matches for unknown names using existing fuzzy matching from `search-engine` rather than a new implementation (FR-040, Constitution III)
- [ ] T094 [US6] Render table and deck results inline in the chat transcript, reusing `RollMessage.svelte` where possible
- [ ] T095 [US6] Implement "send result into entity creation or a generator as context" (FR-041)
- [ ] T096 [P] [US6] Extend `apps/web/tests/random-tables.spec.ts` with an Oracle-chat roll asserting the result appears in both the transcript and roll history

**Checkpoint**: All six stories complete

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T097 Add a help article for tables and decks to `apps/web/src/lib/config/help-content.ts`, covering reference syntax and deck reset (Constitution VII)
- [ ] T098 [P] Add a `FeatureHint` for first-time use of the table editor, since reference syntax is exactly the complex interaction that clause names
- [ ] T099 [P] Confirm `packages/random-source-engine` meets the 70% coverage goal via `bun run test:coverage --filter random-source-engine` (Constitution X)
- [ ] T100 Verify the p95 roll budget of under 50 ms in-process on a 1,000-entry table at full depth (SC-003, R7)
- [ ] T101 [P] Confirm every user-facing string uses plain language and that no "tag" wording appears anywhere (Constitution IX, XII)
- [ ] T102 Run the full manual verification list in quickstart.md, including a Google Drive push on one device and pull on another to confirm deck state travels with the vault
- [ ] T103 Run `bun run lint` and `bun run test` across the repo and confirm both pass (Constitution VI.3)
- [ ] T104 Update `specs/157-random-tables-decks/checklists/requirements.md` to record implementation completion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup — blocks every user story
- **US1 (Phase 3)**: needs Foundational. No dependency on other stories
- **US2 (Phase 4)**: needs US1 — extends the engine and roller US1 creates
- **US3 (Phase 5)**: needs US2. Import lands after resolution deliberately: importing into a system that cannot yet resolve references would need a second pass over those files
- **US4 (Phase 6)**: needs Foundational only. **Genuinely parallel with US2/US3** — decks touch `deck-service.ts` and `DeckView.svelte`, which no table task touches
- **US5 (Phase 7)**: needs US4; T085/T086 also need US2's resolver
- **US6 (Phase 8)**: needs US1 for tables and US4 for decks
- **Polish (Phase 9)**: needs every story being shipped

### Within Each User Story

- Tests first, confirmed failing, before implementation
- Types → engine logic → store → UI → E2E
- Story complete and independently verified before the next

### Parallel Opportunities

- T002/T003/T004 (Phase 1 scaffolding, separate files)
- T009/T011/T013 (Phase 2 test authoring, separate files)
- All test-authoring tasks within a story marked [P]
- T055/T056/T057 — the three import parsers are independent modules
- **US4 alongside US2/US3** is the biggest win: the deck path and the table path share only the Phase 2 foundation

### Parallel Example: User Story 2 tests

```bash
Task: "Write failing resolver tests in packages/random-source-engine/tests/resolver.test.ts"
Task: "Write failing cycle tests in packages/random-source-engine/tests/resolver.cycles.test.ts"
Task: "Write failing depth tests in packages/random-source-engine/tests/resolver.depth.test.ts"
Task: "Write failing unresolved-reference tests in packages/random-source-engine/tests/resolver.unresolved.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 (US1)
2. **STOP and VALIDATE**: author a table, roll it, check history
3. US1 alone is shippable — a GM has something usable at the table tonight

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → MVP, ship
3. US2 → the complete table system the request actually asked for; a natural release point
4. US3 → removes the adoption barrier of hand-typing rows
5. US4 → decks, standalone value for solo players
6. US5 → Oracle/Tarot polish
7. US6 → mid-session convenience across everything above

### Parallel Team Strategy

After Phase 2, one developer can take the table path (US1 → US2 → US3) while
another takes the deck path (US4 → US5). They converge at US6.

---

## Notes

- **Deck state is one plain file per deck with no merge rule** (T067, T069). Drive transfer is an explicit whole-vault push/pull, not live sync, so there is no concurrent writer to design around
- **`Card.id` must be stable across edits** (T074) or every deck silently resets
- **Use `DiceEngine`, never `Math.random()`** (T010, T078) — SC-008 is tested against a seeded provider and will fail otherwise
- **Coverage diagnostics never block save** (T020); only a duplicate name does
- **"Labels", never "tags"** — the vault frontmatter parser rejects a `tags` key outright
- Commit messages must not contain `#NNNN` in the body; commitlint parses that line as a footer and rejects the commit
- Commit after each task or logical group; stop at any checkpoint to validate
