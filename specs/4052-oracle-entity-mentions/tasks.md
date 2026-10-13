---
description: "Task list for Oracle Entity @Mentions"
---

# Tasks: Oracle Entity @Mentions

**Input**: Design documents from `/specs/4052-oracle-entity-mentions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required (Constitution II). Write each test first and see it fail. Each behaviour has a success test and at least one negative test (hidden, deleted, ambiguous, no match, edited token).

**Validation scope**: Only impacted code: `bun run lint:changed`, `bun run test:changed`, and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`. Never run repo-wide suites. Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` before any commit.

**Format**: `- [ ] T### [P?] [Story?] Description with file path`. `[P]` means a different file with no dependency on unfinished tasks.

**Story map** (spec priority): US1 Pick and ask (P1), US2 Several mentions (P1), US6 Hidden stays hidden (P1), US3 Typed `@name` (P2), US4 Links in conversation (P2), US5 Phone and keyboard (P2).

## Phase 1: Setup

- [x] T001 Create the `packages/entity-mention-engine` workspace package (`package.json`, `tsconfig.json`, `bunfig.toml`, `src/index.ts`) mirroring `packages/solo-session-engine`, and add it to the root workspace and `apps/web` dependencies
- [x] T002 [P] Define the shared types in `packages/entity-mention-engine/src/types.ts`: `Mention` (`entityId`, `displayName`, `entityType`, `start`, `end`), `MentionSuggestion`, `ResolvedMention` with status `resolved | ambiguous | unavailable | unmatched`, `MentionSource` (`getEntity`, `isVisible`, `listCandidates`), as in `contracts/entity-mention-engine.md`
- [x] T003 [P] Add the optional `mentions?: Mention[]` field to `ChatMessage` and `mentions?: ResolvedMention[]` to `OracleIntent` in `packages/oracle-engine/src/types.ts` (optional so old history stays valid)
- [x] T004 [P] Add `options?: { pinnedEntityIds?: string[] }` to `retrieveContext` in `packages/schema/src/ai.ts`

## Phase 2: Foundational (blocks all stories)

- [x] T005 [P] Write failing tests for `detectTrigger` in `packages/entity-mention-engine/src/trigger.test.ts`: `@ela` at word start and after whitespace or newline; null for `a@b.com`, mid-word `@`, caret before the `@`, and a trailing space ending the query
- [x] T006 Implement `detectTrigger(text, caret)` in `packages/entity-mention-engine/src/trigger.ts`
- [x] T007 [P] Write failing tests for `reconcile` and `serialize` in `packages/entity-mention-engine/src/draft.test.ts`: ranges shift on insert and delete before a mention; any edit inside `@displayName` drops that mention; overlapping or out-of-range items dropped; `serialize` output equals input for valid data and removes invalid items
- [x] T008 Implement `reconcile(prev, next, mentions)` and `serialize(mentions, text)` in `packages/entity-mention-engine/src/draft.ts` (valid only if `text.slice(start, end) === "@" + displayName`)
- [x] T009 [P] Write failing tests for `applySelection` in `packages/entity-mention-engine/src/draft.test.ts`: replaces `@query` with `@Display Name `, records the mention, returns the new caret, shifts later mentions; negative case: a stale trigger leaves the text unchanged
- [x] T010 Implement `applySelection` in `packages/entity-mention-engine/src/draft.ts`
- [x] T011 Export the public API from `packages/entity-mention-engine/src/index.ts`
- [x] T012 [P] Write the failing test for the pinned-context builder in `packages/ai-engine/src/pinned-context.test.ts`: pinned entities in full and in order, then one-line summaries of directly linked entities, under the 10,000-character cap, with pinned entities kept first when over budget; negative cases: unknown id skipped, hidden id skipped in guest or shared mode
- [x] T013 Implement `buildPinnedContext` in `packages/ai-engine/src/pinned-context.ts` (full pinned content, then bounded one-line summaries of direct connections; re-checks existence and `isEntityVisible`; returns `primaryEntityId`, `sourceIds`, `entries`)
- [x] T014 Add failing tests to `packages/ai-engine/src/context-retrieval.service.test.ts`: with `pinnedEntityIds` the first valid id is primary even when name matching or search points elsewhere; without the option behaviour is unchanged; an invalid id is dropped and the call still succeeds
- [x] T015 Wire `options.pinnedEntityIds` into `retrieveContext` in `packages/ai-engine/src/context-retrieval.service.ts` by calling `buildPinnedContext`; keep `findExplicitSubject` as the fallback for text with no pins (only the call site and option type change in this file)

**Checkpoint**: the mention model and the pinned retrieval path work without any UI.

## Phase 3: User Story 1 - Mention an entity and get a grounded answer (P1) MVP

**Goal**: Type `@`, pick an entity, send, and get an answer grounded in that exact entity.
**Independent Test**: In a Vault with "Elara Voss", type `@ela`, pick her, send "Who is @Elara Voss?"; the answer uses her entry, and a same-named duplicate is not used.

### Tests for US1

- [x] T016 [P] [US1] Write failing tests for `suggest` in `packages/entity-mention-engine/src/suggest.test.ts`: `@ela` returns Elara Voss with type and descriptor; alias hits are labelled; ranking puts prefix and exact matches first; empty query returns recent or top entities; limit respected; negative: no match returns an empty list
- [x] T017 [P] [US1] Write failing tests for `resolve` in `packages/entity-mention-engine/src/resolve.test.ts`: a tracked mention resolves by `entityId` even when the title text differs; renamed entity still resolves; missing entity returns `unavailable`
- [x] T018 [P] [US1] Write failing tests in `apps/web/src/lib/stores/oracle/tests/chat-manager-mentions.test.ts`: `sendMessage` stores `mentions` on the user message and passes resolved ids on the intent; plain text without mentions behaves as before; slash commands ignore mentions
- [x] T019 [P] [US1] Write failing tests in `packages/oracle-engine/src/oracle-generator.test.ts`: `retrieveForQuery` passes `pinnedEntityIds` from the intent to `retrieveContext`, and omits the option when there are none
- [x] T020 [P] [US1] Write a failing component test for the picker in `apps/web/src/lib/components/oracle/EntityMentionPicker.test.ts`: renders name, type and descriptor; click or tap selects; loading and empty states shown
- [x] T021 [P] [US1] Write a failing component test for the composer controller in `apps/web/src/lib/components/oracle/oracle-mention-controller.test.ts`: typing `@ela` opens the picker; selecting inserts `@Elara Voss ` and records the mention; Send clears draft mentions; editing the token drops the mention

### Implementation for US1

- [x] T022 [US1] Implement `suggest(query, source, searchHits, limit)` in `packages/entity-mention-engine/src/suggest.ts` (title and alias match, descriptor from summary or first content line, `disambiguator` when titles collide)
- [x] T023 [US1] Implement `resolve(text, mentions, source)` for tracked mentions in `packages/entity-mention-engine/src/resolve.ts`
- [x] T024 [US1] Pass `intent.mentions` ids as `pinnedEntityIds` in `retrieveForQuery` in `packages/oracle-engine/src/oracle-generator.ts`
- [x] T025 [US1] Create `apps/web/src/lib/components/oracle/EntityMentionPicker.svelte` (props `suggestions`, `loading`, `activeIndex`, `onSelect`, `onClose`, `anchorEl`; Floating UI placement above the input; Tailwind 4 semantic tokens; Iconify icons via the `categories` store)
- [x] T026 [US1] Create `apps/web/src/lib/components/oracle/oracle-mention-controller.svelte.ts`: holds draft mentions, calls `detectTrigger`, debounces `searchService.search` (about 120 ms) combined with in-memory title and alias prefix hits for 1-2 character queries, and exposes `select`
- [x] T027 [US1] Wire the controller and picker into `apps/web/src/lib/components/oracle/OracleChat.svelte` next to `CommandMenu`, without regressing `/` commands or `getOracleChatDraft`
- [x] T028 [US1] In `apps/web/src/lib/stores/oracle/chat-manager.svelte.ts` call `resolve` on send, attach the result to the user message and the intent, and let `OracleCommandParser` leave command intents untouched
- [x] T029 [US1] Add a Help article for mentioning an entity (how to open the picker, what is shared with Oracle, limits: active Vault only, no Cif or VTT Chat yet) under `apps/web/src/lib/content/help/`, and register it in the help catalogue
- [x] T030 [US1] Add a `FeatureHint` on first `@` use if the hint pattern fits the composer (decision recorded in the PR)

**Checkpoint**: US1 works end to end and can ship as the MVP.

## Phase 4: User Story 2 - Several mentions in one message (P1)

**Goal**: Two or more mentions all ground the answer, within the context cap.
**Independent Test**: "How is @Elara Voss connected to @Royal Academy of Pagen?" grounds both; with very large entities, explicit mentions stay and linked summaries are trimmed.

- [x] T031 [P] [US2] Write failing tests in `packages/entity-mention-engine/src/resolve.test.ts` for multiple tracked mentions, duplicates of one entity collapsed, order preserved
- [x] T032 [P] [US2] Write failing tests in `packages/ai-engine/src/pinned-context.test.ts` for 3+ pins: all present in `sourceIds` in order, first is primary, cap trims linked summaries first and then later pins with a truncation marker, never the first pin
- [x] T033 [P] [US2] Write a failing composer test in `apps/web/src/lib/components/oracle/oracle-mention-controller.test.ts`: two selections keep correct ranges when text is inserted between them
- [x] T034 [US2] Implement multi-pin ordering, de-duplication and cap handling in `packages/ai-engine/src/pinned-context.ts` and `packages/entity-mention-engine/src/resolve.ts`
- [ ] T035 [US2] Update `quickstart.md` scenario 2 only if observed behaviour differs

## Phase 5: User Story 6 - Hidden entities stay hidden (P1)

**Goal**: No hidden or other-Vault entity is suggested, resolved or sent as context (clarification Q1: the Vault's existing rules, no GM override).
**Independent Test**: With a hidden entity and a second Vault entity, neither appears in the list, a pasted mention for either sends as plain text, and neither reaches Oracle context.

- [x] T036 [P] [US6] Write failing tests in `packages/entity-mention-engine/src/suggest.test.ts` and `resolve.test.ts`: hidden entities (label `hidden`, default hidden, guest mode) are excluded from suggestions and give `unavailable` on resolve; an id absent from the active Vault gives `unavailable`
- [x] T037 [P] [US6] Write failing tests in `packages/ai-engine/src/pinned-context.test.ts`: a pinned hidden id is dropped at the context stage even if the UI sent it
- [x] T038 [P] [US6] Write a failing test in `apps/web/src/lib/stores/oracle/tests/chat-manager-mentions.test.ts`: pasted mention data for a hidden or foreign-Vault entity is sent as plain text and produces no `mentions` entry
- [x] T039 [US6] Build the `MentionSource` adapter in `apps/web/src/lib/stores/oracle/mention-source.ts` from the active Vault store using `isEntityVisible` with shared and guest settings, excluding drafts as the Explorer does, and scoped to `vault.activeVaultId`
- [x] T040 [US6] Apply the predicate in `suggest`, `resolve` and `buildPinnedContext` (already injected) and reset draft mentions on Vault switch in `oracle-mention-controller.svelte.ts`

## Phase 6: User Story 3 - Typed `@name` without picking (P2)

**Goal**: A unique name or alias match is used; ambiguity asks; no match falls back, and the wrong entity is never attached silently (clarification Q4: no confirm step on a unique match).
**Independent Test**: Send `@archmage` (one alias hit), `@elena` (two), `@zzz` (none).

- [x] T041 [P] [US3] Write failing tests in `packages/entity-mention-engine/src/resolve.test.ts`: unique title or alias match gives `resolved`; two candidates give `ambiguous` with the candidate list; none gives `unmatched`; longest title wins (`@Elara Voss` before `@Elara`); case-insensitive; email-like text ignored
- [x] T042 [P] [US3] Write a failing component test for the disambiguation prompt in `apps/web/src/lib/components/oracle/EntityMentionDisambiguation.test.ts`: lists candidates, choosing one attaches it, "Send as text" sends plain text, and Send does nothing until one of these is chosen
- [x] T043 [US3] Implement untracked `@name` extraction and matching in `packages/entity-mention-engine/src/resolve.ts`
- [x] T044 [US3] Create `apps/web/src/lib/components/oracle/EntityMentionDisambiguation.svelte` and show it from `OracleChat.svelte` when `resolve` returns `ambiguous`
- [x] T045 [US3] Show a plain "No entity matched @zzz" notice for `unmatched` through the existing notification store in `chat-manager.svelte.ts`, then send the text unchanged
- [x] T046 [US3] Update the Help article from T029 with the typed `@name` behaviour

## Phase 7: User Story 4 - Links in the conversation (P2)

**Goal**: Mentions in sent messages open the entity; reply names link only for mentioned or context entities (clarification Q5); rename and delete are handled.
**Independent Test**: Send a mention, activate it by pointer and keyboard, rename the entity and reload, then delete the entity.

- [x] T047 [P] [US4] Write failing tests in `apps/web/src/lib/components/oracle/MentionText.test.ts`: user message renders mention ranges as links with `aria-label`; renamed entity shows the live title; deleted entity renders "unavailable" with no link; assistant text links only exact word-bounded titles from mentioned and source ids; overlapping or unknown names stay plain
- [x] T048 [P] [US4] Write a failing test in `packages/oracle-engine/src/chat-history.test.ts`: `mentions` and assistant `sourceIds` survive save and reload; old messages without them load normally
- [x] T049 [US4] Create `apps/web/src/lib/components/oracle/MentionText.svelte`, reusing the entity-open behaviour used by `DetailHeader.svelte` and `ZenHeader.svelte`
- [x] T050 [US4] Use `MentionText` in `apps/web/src/lib/components/oracle/ChatMessage.svelte` for text content only (no other logic added to this file)
- [x] T051 [US4] Record the retrieval `sourceIds` on the saved assistant message in `packages/oracle-engine/src/oracle-generator.ts` and the `ChatMessage` type, and pass them to `MentionText`

## Phase 8: User Story 5 - Phone and keyboard (P2)

**Goal**: Usable on a narrow screen with a soft keyboard, by keyboard alone, and with a screen reader.
**Independent Test**: At 360 px with the soft keyboard open the list and Send are both visible; the whole flow works with the keyboard; the result count is announced.

- [x] T052 [P] [US5] Write failing keyboard and ARIA tests in `apps/web/src/lib/components/oracle/EntityMentionPicker.test.ts`: Up/Down move, Enter and Tab select, Escape closes and keeps the text, focus stays in the textarea, `role="listbox"`, `aria-activedescendant`, a live region announces the count and highlighted entity, empty and loading are announced
- [x] T053 [P] [US5] Write a failing Playwright test in `apps/web/tests/oracle-mention-mobile.spec.ts`: 360 px viewport with a simulated soft keyboard, the picker is inside the visual viewport, rows are at least 48 px tall, the list scrolls, and Send is not covered
- [x] T054 [US5] Implement keyboard handling and ARIA in `EntityMentionPicker.svelte` and key forwarding from `OracleChat.svelte` (shared with the `CommandMenu` handler so only one menu captures keys)
- [x] T055 [US5] Implement `visualViewport`-aware max height and Floating UI `flip` and `shift` placement in `EntityMentionPicker.svelte`

## Phase 9: Polish and cross-cutting

- [x] T056 [P] Write `packages/entity-mention-engine/README.md` documenting the boundaries and reuse notes for Cif and VTT Chat (FR-021)
- [x] T057 [P] Add a regression test in `apps/web/src/lib/components/oracle/OracleChat.prefill.test.ts` and `chat-manager-mentions.test.ts` that plain text, `/draw`, `/connect`, Clear History and Send behave as before (FR-012)
- [x] T058 [P] Add a performance test in `packages/entity-mention-engine/src/suggest.test.ts` for 5,000 entities under 200 ms (SC-002)
- [ ] T059 Add a user-facing changelog entry for Oracle `@` mentions in `apps/web/src/lib/content/changelog/releases.json`, user-facing wording only
- [x] T060 Run `bun run lint:changed`, `bun run test:changed` and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web` and the affected packages; fix every error
- [ ] T061 Walk through all scenarios in `quickstart.md` on desktop and an Android-sized viewport
- [ ] T062 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent`, then the `codex-review` specialist review, before opening the PR

## Dependencies and order

- Setup (T001-T004) -> Foundational (T005-T015) -> stories.
- US1 is the MVP. US2 and US6 depend on US1's `resolve` and `suggest`. US3 depends on `resolve` from US1. US4 depends on stored mentions from US1. US5 depends on the picker from US1.
- US2, US6 and US3 can proceed in parallel after US1. US4 and US5 can proceed in parallel after US1.
- Tests precede implementation in every phase.

## Parallel examples

- Foundational: T005, T007, T009, T012 together (separate test files).
- US1 tests: T016-T021 together, then T022, T023 and T025 (separate files).
- After US1: US2 (T031-T034), US6 (T036-T040) and US5 (T052-T055) in parallel.

## Implementation strategy

1. MVP: Phases 1-3 (US1) - picker, structured mention, pinned context. Validate with quickstart scenarios 1 and 11.
2. Add US6 and US2 (both P1) before any public release, since hiding rules are a trust requirement.
3. Add US3, US4, US5, then Polish.
