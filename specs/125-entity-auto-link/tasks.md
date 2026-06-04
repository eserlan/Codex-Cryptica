# Tasks: Entity Auto-Link in Content & Lore

**Branch**: `125-entity-auto-link` | **Date**: 2026-05-30  
**Input**: `specs/125-entity-auto-link/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Tests**: Required — Constitution II (TDD) and plan.md mandate unit tests for the detector (≥ 80% coverage) and component-level tests for the extension (≥ 50% coverage).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story label (`[US1]`…`[US4]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Declare file structure so TypeScript/bundler resolves imports before any implementation lands.

- [x] T001 Create empty stub `apps/web/src/lib/utils/entity-mention-detector.ts` (export placeholder types: `EntityIndexEntry`, `DetectedMatch`)
- [x] T002 [P] Create empty stub `apps/web/src/lib/components/editor/EntityAutoLinkExtension.ts` (export placeholder `createEntityAutoLinkExtension`)

**Checkpoint**: Both modules importable; no runtime logic yet.

---

## Phase 2: Foundational (Core Detection Infrastructure)

**Purpose**: The pure detector and the TipTap extension plugin are shared prerequisites for all user stories. **No user story can be verified until this phase is complete.**

⚠️ **TDD**: Write and verify the tests FAIL before writing the implementation.

### Detection Utility

- [x] T003 Write failing unit tests for `detectEntityMentions` and `sortEntityIndex` in `apps/web/src/lib/utils/entity-mention-detector.test.ts`
  - Cover: basic match, multiple matches in one string, case-insensitive match (casing preserved), no match for standalone substring, possessive boundary (`"Aldric's"` does not match `"Aldric"`), self-link suppression, longest-match-wins over overlapping candidates, empty index (no crash)
- [x] T004 Implement `EntityIndexEntry`, `DetectedMatch`, `sortEntityIndex`, `detectEntityMentions` in `apps/web/src/lib/utils/entity-mention-detector.ts` (all T003 tests must pass; ≥ 80% line coverage)

### TipTap Extension

- [x] T005 Write failing integration tests for the extension in `apps/web/src/lib/components/editor/EntityAutoLinkExtension.test.ts`
  - Cover: decorations produced when `editable=false`, **no decorations when `editable=true`**, correct `data-entity-id` attribute on decoration, click on `data-entity-id` triggers `onEntityClick`, empty index produces empty DecorationSet, self-link entity ID excluded from decorations
  - Also cover: dispatching a transaction with meta `entityIndexChanged: true` causes decorations to rebuild with the updated index (verifies the reactivity bridge)
- [x] T006 Implement `createEntityAutoLinkExtension` and `EntityAutoLinkOptions` in `apps/web/src/lib/components/editor/EntityAutoLinkExtension.ts`
  - ProseMirror `Plugin` + `DecorationSet` approach per plan.md section B
  - **Editable guard**: read `this.editor.isEditable` (TipTap extension closure reference) inside `addProseMirrorPlugins()` — NOT a closure-captured option value. This ensures the guard responds correctly when `editable` toggles at runtime. Return `DecorationSet.empty` when `true`.
  - **EntityIndex reactivity**: in the `apply` hook, detect `tr.getMeta('entityIndexChanged')` and re-sort `options.entityIndex` into the local `sorted` variable before rebuilding decorations
  - Identity check: skip rebuild if `!tr.docChanged` and `!tr.getMeta('entityIndexChanged')` (plan.md Decision 5)
  - Delegated click listener on `editorView.dom` (plan.md section C); attach on `view` init, remove on `view.destroy`
  - All T005 tests must pass; ≥ 50% line coverage

**Checkpoint**: Detector and extension are fully tested and functional in isolation.

---

## Phase 3: User Story 1 — Detected Mentions in Content (Priority: P1) 🎯 MVP

**Goal**: Names of vault entities appear as clickable links in the content field of any entity detail view (sidebar panel and zen mode).

**Independent Test**: Open any entity whose content text contains the exact title of at least one other vault entity. In read mode, the name should appear with link styling and clicking it should navigate to that entity. Edit mode shows plain text.

### Implementation for User Story 1

- [x] T007 [US1] Add optional props `entityIndex`, `currentEntityId`, `onEntityClick` (with backward-compatible defaults) to `apps/web/src/lib/components/MarkdownEditor.svelte`
  - `entityIndex: EntityIndexEntry[] = []`
  - `currentEntityId: string = ""`
  - `onEntityClick: (id: string) => void = () => {}`
- [x] T008 [US1] Register `createEntityAutoLinkExtension(...)` inside the `useEditor` extensions array in `apps/web/src/lib/components/MarkdownEditor.svelte` and add the entityIndex reactivity bridge
  - Pass `entityIndex`, `currentEntityId`, `onEntityClick` from component props
  - After the `useEditor` call, add a Svelte `$effect` that watches `entityIndex` and dispatches `editor.view.dispatch(editor.state.tr.setMeta('entityIndexChanged', true))` when the reference changes — this ensures live link refresh when vault entities are renamed or added while the view is open (spec edge case)
- [x] T009 [US1] Update the read-mode `<MarkdownEditor>` in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` to pass entity auto-link props
  - Build `entityIndex` from `$vault.entities.flatMap(e => [{ text: e.title.toLowerCase(), id: e.id }, ...e.aliases.map(a => ({ text: a.toLowerCase(), id: e.id }))])`
  - Pass `currentEntityId={entity.id}`
  - Pass `onEntityClick` using context-preserving navigation: `vault.selectedEntityId = id` (sidebar is the context for DetailStatusTab)
  - Note (FR-011): `$vault.entities` is available to both host and guest sessions when the vault is loaded — guest-mode parity for detected links is satisfied by this same prop expression with no additional code path
- [x] T010 [US1] Update the read-mode `<MarkdownEditor>` in `apps/web/src/lib/components/zen/ZenContent.svelte` to pass entity auto-link props
  - Build same `entityIndex` expression
  - Pass `currentEntityId={entity?.id ?? ""}`
  - Pass `onEntityClick` using `focusEntity(layoutUIStore, id)` (zen stays zen per plan.md section C)

**Checkpoint**: US1 fully functional — links appear in content in both sidebar and zen. Clicking navigates correctly. Edit mode shows plain text (guarded by extension).

---

## Phase 4: User Story 2 — Lore Section Links (Priority: P2)

**Goal**: Names of vault entities also appear as clickable links in the lore field.

**Independent Test**: Open an entity that has lore text containing another entity's name. Confirm a link appears in the lore panel and clicks navigate correctly. Does not depend on US3 or US4.

### Implementation for User Story 2

- [x] T011 [US2] Update the read-mode `<MarkdownEditor>` in `apps/web/src/lib/components/entity-detail/DetailLoreTab.svelte` to pass entity auto-link props
  - Build same `entityIndex` expression from `$vault.entities`
  - Pass `currentEntityId={entity.id}`
  - Pass `onEntityClick` using `vault.selectedEntityId = id` (DetailLoreTab is sidebar context)
- [x] T012 [P] [US2] Add lore-specific acceptance tests to `apps/web/src/lib/components/editor/EntityAutoLinkExtension.test.ts`
  - Verify that decorations are independently built for separate editor instances (content editor and lore editor don't share state)
  - Verify same entity name in two separate editors both produce decorations

**Checkpoint**: US1 and US2 both independently functional — links appear in both content and lore.

---

## Phase 5: User Story 3 — No Links in Edit Mode (Priority: P2)

**Goal**: The auto-link overlay is completely absent while editing. No decorations, no interference with cursor/selection.

**Independent Test**: Toggle an entity into edit mode on the content or lore field. Confirm no entity name spans have link styling. Switch back to read mode — links reappear.

### Tests for User Story 3

- [x] T013 [US3] Add edit-mode acceptance scenario tests to `apps/web/src/lib/components/editor/EntityAutoLinkExtension.test.ts`
  - Given entity with content referencing another entity name → in edit mode (`editable=true`) → zero decorations in DecorationSet
  - Given switching from read mode (`editable=false`) → edit mode → DecorationSet becomes empty
  - Given switching from edit mode back to read mode → DecorationSet is rebuilt with decorations

**Checkpoint**: US3 verified — toggling edit mode on/off works correctly and the extension guard is covered by tests.

---

## Phase 6: User Story 4 — Alias Matching (Priority: P3)

**Goal**: Registered aliases resolve to the owning entity. When content contains an alias instead of the full title, the alias is detected and linked to the correct entity.

**Independent Test**: Create an entity with an alias. Reference only the alias in another entity's content. Verify the alias appears as a link pointing to the aliased entity. Verify longest match wins when both full title and alias could match the same span.

### Tests for User Story 4

- [x] T014 [P] [US4] Add alias-specific test cases to `apps/web/src/lib/utils/entity-mention-detector.test.ts`
  - Alias resolves to the correct entity ID
  - Full title beats alias when both could match the same span (longest wins)
  - Multiple entities each with aliases — correct resolution per span
  - Alias at string boundary (start of sentence, end of sentence)
- [x] T015 [P] [US4] Add alias call-site test to `apps/web/src/lib/components/editor/EntityAutoLinkExtension.test.ts`
  - Extension built with an entityIndex that includes alias entries produces a decoration for the alias span

### Implementation for User Story 4

- [x] T016 [US4] Verify alias entries are included in the `entityIndex` expression at all three call sites (T009, T010, T011)
  - The `flatMap` already includes `e.aliases` in the quickstart.md pattern — confirm actual call sites match
  - If aliases were omitted in Phase 3/4, update them now

**Checkpoint**: All 4 user stories are independently functional and tested.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Help content, type safety, coverage verification.

- [x] T017 [P] Add entity auto-link entry to `apps/web/src/lib/config/help-content.ts`
  - Entry should describe the feature from the user's perspective (names of vault entities in content and lore become clickable links)
- [x] T018 Run `bun run typecheck` from `apps/web` and fix any TypeScript errors introduced by the new props and extension
- [x] T019 Run `bun run lint` from `apps/web` and fix any lint warnings in the new/modified files
- [x] T020 Run `bun run test --coverage` and confirm entity-mention-detector ≥ 80% line coverage and EntityAutoLinkExtension ≥ 50% line coverage
- [x] T021 [P] Review `apps/web/src/lib/components/MarkdownEditor.svelte` for any prop default regressions — all existing call sites (edit mode) should continue working unchanged
- [ ] T022 Manually profile detection against a ~5 000-word entity with ~100 vault entities in the browser DevTools Performance tab; confirm total time < 100 ms (SC-002 baseline: mid-range laptop). Record the observed timing in a comment at the top of `apps/web/src/lib/utils/entity-mention-detector.ts` for future reference

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies — start immediately
- **Phase 2** (Foundational): Depends on Phase 1 — **blocks all user stories**
- **Phase 3** (US1 — P1): Depends on Phase 2 only — no other story dependencies
- **Phase 4** (US2 — P2): Depends on Phase 2; benefits from Phase 3 prop additions (T007, T008) but is independently testable
- **Phase 5** (US3 — P2): Depends on Phase 2; the editable guard is already in the extension from T006
- **Phase 6** (US4 — P3): Depends on Phase 2 for the detector; aliases are an additive change to the call sites
- **Phase 7** (Polish): Depends on all prior phases

### User Story Dependencies

| Story    | Phase | Hard Dependency                            | Can Parallelize With |
| -------- | ----- | ------------------------------------------ | -------------------- |
| US1 (P1) | 3     | Phase 2 done                               | —                    |
| US2 (P2) | 4     | Phase 2 done; T007+T008 reduce duplication | US3                  |
| US3 (P2) | 5     | Phase 2 done (T006 editable guard)         | US2                  |
| US4 (P3) | 6     | Phase 2 done (T003+T004 for aliases)       | —                    |

### Within Each Phase

- T003 (tests) **must** fail before T004 (implementation) begins
- T005 (tests) **must** fail before T006 (implementation) begins
- T007 (MarkdownEditor props) must complete before T008–T010 (call sites) can be integrated
- T014, T015 (alias tests) should fail before T016 is validated

---

## Parallel Execution Examples

### Phase 2 Parallel

```
T003 → T004 (sequential: test-then-implement detector)
T005 → T006 (sequential: test-then-implement extension)
— T003/T004 and T005/T006 pairs can run in parallel after T001/T002
```

### Phase 3 Parallel

```
T009 (DetailStatusTab call site)  ← can run in parallel →  T010 (ZenContent call site)
Both depend on T007 + T008 completing first
```

### Phase 4+5 Parallel (after Phase 3)

```
T011 (lore call site)   ← parallel →   T013 (edit-mode tests)
T012 (lore ext tests)   ← parallel →   T013
```

### Phase 6 Parallel

```
T014 (detector alias tests)   ← parallel →   T015 (extension alias test)
Both → T016 (verify call sites)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup stubs
2. Complete Phase 2: Foundational (detector + extension) — **CRITICAL BLOCKER**
3. Complete Phase 3: US1 — content links in sidebar + zen
4. **STOP and VALIDATE**: entity names in content render as links; clicking navigates; edit mode is clean
5. Ship/demo — delivers the full P1 value

### Incremental Delivery

1. **Foundation** (Phase 1 + 2) → pure utility + extension, zero UI change
2. **MVP** (Phase 3 → US1) → content links in sidebar + zen — ship this
3. **Parity** (Phase 4 → US2) → lore links — ship this
4. **Safety** (Phase 5 → US3) → edit-mode test verification — completes P2
5. **Completeness** (Phase 6 → US4) → alias support — completes P3
6. **Polish** (Phase 7) → help text + coverage validation

### Single Developer Order

```
T001 → T002 → T003 → T004 → T005 → T006
→ T007 → T008 → T009 → T010          (MVP done, all P1 verified)
→ T011 → T012                         (US2 lore)
→ T013                                 (US3 edit-mode tests)
→ T014 → T015 → T016                  (US4 aliases)
→ T017 → T018 → T019 → T020 → T021   (polish)
```

---

## Notes

- **[P]** = different files with no pending dependencies — safe to run concurrently
- **[USn]** label maps each task to the user story it delivers
- `MarkdownEditor.svelte` changes (T007, T008) are backward-compatible — existing callers without the new props continue to work (empty index → no decorations)
- Do not modify the `editable` prop behaviour in MarkdownEditor itself — the extension handles the guard internally
- Commit after each phase checkpoint for clean rollback points
- `bun run test --filter entity-mention` to run detector tests only; `bun run test --filter EntityAutoLink` to run extension tests only
