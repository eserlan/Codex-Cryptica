# Implementation Plan: Solo Play Loop

**Branch**: `feat/173-solo-play-loop` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/173-solo-play-loop/spec.md`
**Issue**: #3884, part of epic #3839. Builds on spec 172 (#3879).

## Summary

Phase 2 of Solo Play Mode closes the play loop. From the solo bar the player can do six new things:

- generate an NPC, encounter, rumour or complication through the existing generator, with the result journaled;
- roll up to three pinned random tables inline;
- save any recent journal result to the Vault as a draft, without leaving the screen;
- set the session's party;
- browse and return to earlier scenes;
- use four Oracle shortcuts while AI is on. Each prefills an editable question with the session context and sends nothing by itself.

Technically, almost everything reuses existing parts:

- the generator workflow and its save;
- the table roll and its journal capture, extracted into one shared helper;
- the journal promoter, as a second instance that doesn't navigate;
- `JOURNAL:CAPTURE`, with three new entry types;
- the Oracle `ui` manager, which gains a `pendingPrompt`.

Pure logic goes into the existing `solo-session-engine` and `session-journal-engine` packages. The UI is six small popover components composed into the existing bar and sheet. There's no new dependency, no schema migration, and no network call except an Oracle question the player sends. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `solo-session-engine` and `session-journal-engine` (both extended), `random-source-engine` via `randomSourceStore.roll`, the generator workflow (`modalUIStore.openGeneratorWorkflow`, `CampaignGeneratorModal`), `SessionJournalPromoter`, the Oracle `ui` manager and `OracleChat`, `@codex/events` (`JOURNAL:CAPTURE`), `help-engine`, Tailwind 4 semantic tokens and Iconify classes. No new third-party dependency.
**Storage**: Extended `codex-solo-session:<vaultId>` record (new optional `partyIds` and `scenes`, still version 1, and Phase 1 records stay valid). New `codex-solo-table-pins:<vaultId>` in `localStorage`. Three new journal entry types written through the existing capture path. No IndexedDB, OPFS or vault schema change.
**Testing**: Vitest (engines, stores, services, and components with jsdom); help-engine tests and evaluation set.
**Target Platform**: Browser, desktop and phone; offline-capable apart from the Oracle.
**Project Type**: Web application in a Bun monorepo.
**Performance Goals**: Pinned-table rolls and opening menus respond within one frame. Recent results come from in-memory journal state with no extra reads.
**Constraints**:

- AI is optional: every story except US5 works with AI off.
- Local-first: the only network path is an Oracle question the player sends.
- Shared-play, guest and Player View behaviour is unchanged.
- The bar stays on one line on desktop and scrolls when narrow.
  **Scale/Scope**:
- At most 3 pins, 12 party members, 100 scenes and 10 recent results.
- Six user stories, each independently shippable.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                   | Status | How                                                                                                                                                                                                            |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS   | Formatters, the recent-results selector, party and scene transitions, category suggestion and the Oracle prompt builder go into `session-journal-engine` and `solo-session-engine`, both framework-free.       |
| II. TDD                     | PASS   | Every contract in [contracts](./contracts/solo-play-loop.md) lists its tests, including failure paths: empty name, no journal, unavailable generators, deleted table or member, AI off, bus or storage errors. |
| III. Simplicity & YAGNI     | PASS   | Reuses the generator workflow, journal capture, promoter and table roll. The table-roll recording is extracted, not copied (R3). No new generator or Oracle UI.                                                |
| IV. AI-First Extraction     | N/A    | No extraction.                                                                                                                                                                                                 |
| V. Privacy & Client-Side    | PASS   | Pins, party and scenes stay local. Oracle shortcuts only prefill; the player sends (R7, R10). No remote storage, so the opt-in exception does not apply.                                                       |
| VI. Clean Implementation    | PASS   | Runes, semantic tokens, Iconify, injected dependencies. VI.3 is met by impacted-only checks locally plus green PR CI before merge, as in spec 172.                                                             |
| VII. User Documentation     | PASS   | `solo-session` article sections, Cif controls, workflows and evaluation questions (R9).                                                                                                                        |
| VIII. Dependency Injection  | PASS   | `SoloTablePinsStore`, the capture publishers, `recordTableRoll` and `soloPromoter` take their dependencies; the session store's new methods use its existing ports.                                            |
| IX. Natural Language        | PASS   | Plain labels: "Generate", "Pin a table", "Save to Vault", "Party", "Scenes", "How does this NPC react?".                                                                                                       |
| X. Quality & Coverage       | PASS   | Engine additions keep both packages at or above 70%.                                                                                                                                                           |
| XI. Agent Protocol          | PASS   | Surgical edits to existing files (two publisher calls, one helper extraction, one optional filter).                                                                                                            |
| XII. Labels over Tags       | N/A    | No categorisation UI.                                                                                                                                                                                          |
| XIII. Discovery Intent      | N/A    | No public page.                                                                                                                                                                                                |
| XIV. Bounded Responsibility | PASS   | See below.                                                                                                                                                                                                     |

### Discovery Intent Check

N/A: no public, indexable page.

### Bounded Responsibility Check

- [x] Files over 500 lines this feature touches:
  - `components/generators/CampaignGeneratorModal.svelte` (814): it still runs the generator workflow and gains only two calls to the new publisher module. Formatting and publishing live outside it.
  - `stores/ui/modal-ui.svelte.ts` (559): not edited; only its existing `openGeneratorWorkflow` is called.
- [x] New behaviour has its own home:
  - `services/generator-journal-capture.ts`;
  - `services/record-table-roll.ts`, extracted from `TableRoller.svelte` (316);
  - `stores/solo-table-pins.svelte.ts`;
  - six new `components/solo/*` popovers.
  - `solo-session.svelte.ts` grows from 271 to about 370 lines and keeps one responsibility, the session.
- [x] The extraction from `TableRoller` keeps its tests, and the helper gains its own.

### User Help Check

- [x] The `solo-session` article gains sections for Generate, pinned tables, recent results and Save to Vault, party, scenes and Oracle shortcuts (AI only).
- [x] Cif gets six new solo controls, new workflows on the `solo-session` feature, and five evaluation questions. Embeddings are regenerated.
- [x] FeatureHint: not used, as in Phase 1.

**Post-design re-check**: PASS on all gates. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/173-solo-play-loop/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── solo-play-loop.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/session-journal-engine/
├── src/capture.ts            # + formatGeneratedResult, formatGeneratedSaved, formatPartyChange
├── src/recent.ts             # new: recentResults
└── tests/                    # capture + recent tests

packages/solo-session-engine/
├── src/types.ts              # SoloSession + partyIds, scenes; SoloScene
├── src/session.ts            # parse defaults; withParty, withSceneAdded, withCurrentSceneRenamed, nextVisitName
├── src/defaults.ts           # + suggestCategory, buildOracleShortcutPrompt
└── tests/

packages/help-engine/
├── src/actions/catalogue.ts            # + 6 solo controls
├── src/registry/features/solo-session.ts  # + workflows
└── tests/eval/phase-a-questions.ts     # + 5 questions

apps/web/src/lib/
├── services/generator-journal-capture.ts   # new
├── services/record-table-roll.ts           # new (extracted)
├── stores/solo-table-pins.svelte.ts        # new
├── stores/solo-session.svelte.ts           # + setParty, returnToScene, party, scenes
├── stores/solo-session-instance.ts         # wire pins store + soloPromoter
├── stores/oracle/ui-manager.svelte.ts      # + pendingPrompt
├── stores/quicknote.svelte.ts              # openJournal({ sectionId })
├── stores/help-assistant/help-context.svelte.ts  # + new solo controls
├── components/solo/
│   ├── SoloGenerateMenu.svelte / SoloPinnedTables.svelte / SoloRecentResults.svelte
│   ├── SoloSaveResultDialog.svelte / SoloPartyMenu.svelte / SoloSceneMenu.svelte
│   ├── SoloOracleMenu.svelte
│   └── SoloActions / SoloSessionSheet / SoloSetupDialog (composition, party picker)
├── components/quicknote/SessionJournalView.svelte  # section filter + Show all
├── components/oracle/OracleChat.svelte             # consume pendingPrompt
├── components/generators/CampaignGeneratorModal.svelte  # 2 publisher calls
├── components/random/TableRoller.svelte            # use recordTableRoll
└── content/help/solo-session.md                    # new sections
```

**Structure Decision**: Same split as spec 172. Pure rules go in the two engine packages, orchestration in `stores` and `services`, and the UI in `components/solo`, composed into the existing bar and sheet.

## Delivery slices

Each slice matches a story and can ship on its own. US1 and US2 together are the most valuable first PR.

1. **US1, Save discoveries (P1)**: `recentResults`, `suggestCategory`, `soloPromoter`, `SoloRecentResults`, `SoloSaveResultDialog`.
2. **US2, Generate (P1)**: the capture formatters, `generator-journal-capture`, the two modal calls, `SoloGenerateMenu`.
3. **US3, Pinned tables (P2)**: extract `recordTableRoll`, `SoloTablePinsStore`, `SoloPinnedTables`.
4. **US4, Party (P2)**: engine party fields, `setParty`, `formatPartyChange`, `SoloPartyMenu`, the setup picker.
5. **US5, Oracle shortcuts (P3)**: the prompt builder, `pendingPrompt`, the `OracleChat` hook, `SoloOracleMenu`.
6. **US6, Scene history (P3)**: engine scene list, `returnToScene` (numbered visits), `SoloSceneMenu`, the journal section filter.
7. **Help and Cif** for all of the above, then embeddings.

## Risks

- **The bar gets crowded.** Five popovers keep the desktop bar to one line, the action group scrolls when narrow, and the phone sheet groups items (R8). The quickstart checks phone width.
- **Journal noise.** Every generated draft becomes an entry. Mitigation: one short entry per generation, plus a follow-up only on save. Journal capture controls are Phase 3.
- **Changing two shared components.** `CampaignGeneratorModal` and `TableRoller` are used outside solo play. The publisher swallows its own errors, and the `TableRoller` extraction keeps its existing tests, so neither can break generation or rolling.
- **Prompt size.** The Oracle context is clamped (10 recent results of 120 characters each, 1,200 in total) so a shortcut never sends a huge prompt.
- **Session record compatibility.** The new fields are optional with defaults, and a test confirms a Phase 1 record still parses.

## Complexity Tracking

None.
