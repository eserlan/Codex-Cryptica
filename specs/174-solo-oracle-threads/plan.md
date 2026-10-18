# Implementation Plan: Solo Oracle and Threads

**Branch**: `feat/174-solo-oracle-threads` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/174-solo-oracle-threads/spec.md`
**Issue**: #3885, part of epic #3839. Builds on spec 172 (#3879) and spec 173 (#3908).

## Summary

Phase 3 gives the solo player a GM stand-in and a campaign memory. From the solo bar the player can:

- ask a yes/no question at one of five likelihoods and get a qualified answer by dice;
- get random events, whose frequency follows a tension level from 1 to 9;
- keep threads (questions, leads, objectives, mysteries) that link to vault entries and persist with the vault;
- choose per journal which event types are captured;
- hand a scene to the Oracle through Adventure Mode, as an explicit AI-only choice.

Everything except interpretation and the Adventure entry works with AI off.

Technically:

- **The yes/no roll** reuses the quick oracle in `oracle-engine`, with two more odds.
- **Oracle procedures, event tables and thread rules** go into `solo-session-engine`, and the capture rules into `session-journal-engine`.
- **Threads** are stored in the vault as `.codex/threads.json`, through the existing file helpers, so backups and exports include them.
- **Capture choices** are one optional field on the journal record.
- **The UI** is two new solo menus, one item in the existing AI-only Ask Oracle menu, and a Capture menu in the journal header.

There is no new dependency, no migration, and no network call except an Oracle question the player sends. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `oracle-engine` (`rollOracleOutcome`, widened), `solo-session-engine` and `session-journal-engine` (both extended), the vault file helpers (`getVaultDir`, `writeOpfsFile`, `readOpfsBlob`), `@codex/events` (`JOURNAL:CAPTURE`), the Oracle `ui` manager's pending prompt, Adventure Mode at `/adventure`, `help-engine`, Tailwind 4 semantic tokens and Iconify classes. No new third-party dependency.
**Storage**:

- Threads in the vault as `.codex/threads.json` (version 1, at most 200). They are included in vault exports (.codex.zip) and in Save to Folder and Load from Folder, which mirror every vault file. Cloud backup is out of scope, because it sends an explicit list under its consent screen.
- An optional `tension` on the `codex-solo-session:<vaultId>` record (still version 1).
- An optional `captureOff` on IndexedDB `session_journals` records, with no migration.
  **Testing**: Vitest (engines, stores, services, and components with jsdom); help-engine tests and evaluation set.
  **Target Platform**: Browser, desktop and phone; offline-capable apart from the Oracle.
  **Project Type**: Web application in a Bun monorepo.
  **Performance Goals**: An oracle answer appears within one frame of rolling. The threads file is read once per vault switch and written in under 100 ms for 200 threads.
  **Constraints**:
- AI is optional: everything but US5 and interpretation works with AI off (FR-007).
- Wording and tables are original (FR-008).
- Local-first: no network except a player-sent Oracle question.
- Shared-play, guest and Player View behaviour is unchanged.
- Read-only vaults (such as guests) cannot edit threads.
  **Scale/Scope**: At most 200 threads per vault, 20 links per thread, tension from 1 to 9, ten capture kinds and five user stories.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                   | Status | How                                                                                                                                                                                                                               |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS   | The oracle procedure, event tables, thread rules and tension go in `solo-session-engine`. Capture rules and formatters go in `session-journal-engine`. Odds go in `oracle-engine`. All three are framework-free.                  |
| II. TDD                     | PASS   | Every contract lists its tests, including failure paths: empty title, the 201st thread, a bad file version, a write failure, a read-only vault, tension bounds, an event with no threads or party, and a capture kind turned off. |
| III. Simplicity & YAGNI     | PASS   | Reuses the quick oracle, the capture path, the pending prompt, Adventure Mode and the vault file helpers. One threads file, not a new store. No editable tables.                                                                  |
| IV. AI-First Extraction     | N/A    | No extraction.                                                                                                                                                                                                                    |
| V. Privacy & Client-Side    | PASS   | Threads stay in the vault the player owns, and travel only where the vault does (clarification A). The oracle is local, and interpretation only prefills.                                                                         |
| VI. Clean Implementation    | PASS   | Runes, semantic tokens, Iconify and injected dependencies. VI.3 (amended in 1.8.0): impacted-only checks locally, plus the full suites in PR CI.                                                                                  |
| VII. User Documentation     | PASS   | Help sections, Cif controls, workflows and evaluation questions (R10).                                                                                                                                                            |
| VIII. Dependency Injection  | PASS   | `SoloThreadsStore` takes file access, ids, clock and capture publishing. The oracle takes an rng.                                                                                                                                 |
| IX. Natural Language        | PASS   | Plain labels: "Yes or no", "Random event", "Tension", "Threads", "Capture", "Let the Oracle run a scene".                                                                                                                         |
| X. Quality & Coverage       | PASS   | The three engines stay at or above 70%.                                                                                                                                                                                           |
| XI. Agent Protocol          | PASS   | Surgical edits: two odds in `oracle-engine`, one check in the capture listener, the header toggle replaced.                                                                                                                       |
| XII. Labels over Tags       | N/A    | Thread kinds are a fixed list, not tags.                                                                                                                                                                                          |
| XIII. Discovery Intent      | N/A    | No public page. The solo play blog post comes later and is registered then.                                                                                                                                                       |
| XIV. Bounded Responsibility | PASS   | See below.                                                                                                                                                                                                                        |

### Bounded Responsibility Check

- [x] Files over 500 lines that this feature touches: none planned. `solo-session.svelte.ts` (about 380 lines) gains tension and oracle actions, about 60 lines. If it passes 450, the oracle actions move to `solo-oracle.svelte.ts`.
- [x] New behaviour has its own home: `stores/solo-threads.svelte.ts`, `services/vault-threads-file.ts`, and the new `components/solo/*` and `components/quicknote/JournalCaptureMenu.svelte`.

### User Help Check

- [x] The `solo-session` article gains Yes or no, Random events and tension, and Threads. The session journal article gains Capture.
- [x] Cif gets three controls, workflows and five evaluation questions. The bundle and embeddings are regenerated.
- [x] FeatureHint: not used. The Yes or no and Threads menus show their purpose inline (an empty-state line in Threads, and labels in Yes or no), and Help and Cif cover them, as in Phases 1 and 2.

**Post-design re-check**: PASS on all gates. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/174-solo-oracle-threads/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── solo-oracle-threads.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/oracle-engine/src/quick-oracle.ts          # + very_likely / very_unlikely
packages/solo-session-engine/
├── src/oracle.ts             # new: askOracle, eventHappens, rollRandomEvent, answer scale
├── src/event-tables.ts       # new: foci, actions, subject resolution (original text)
├── src/threads.ts            # new: thread rules and the file format
├── src/session.ts            # + tension parse default, withTension
└── tests/
packages/session-journal-engine/
├── src/capture.ts            # + formatters for the four new entry types
├── src/capture-kinds.ts      # new: CaptureKind, captureKindOf, isCaptured, withCaptureChoice
└── tests/
packages/help-engine/         # + controls, workflows, evaluation questions

apps/web/src/lib/
├── services/vault-threads-file.ts            # new: read and write .codex/threads.json
├── stores/solo-threads.svelte.ts             # new: SoloThreadsStore
├── stores/solo-session.svelte.ts             # + tension, ask, randomEvent, scenes capture check
├── stores/solo-session-instance.ts           # wire the threads store
├── stores/session-journal-capture.ts         # isCaptured in place of the map-move check
├── stores/session-journal.svelte.ts          # setCaptureChoice
├── components/solo/SoloYesNoMenu.svelte      # new
├── components/solo/SoloThreadsMenu.svelte    # new
├── components/solo/SoloThreadDialog.svelte   # new
├── components/solo/SoloOracleMenu.svelte     # + Adventure entry, interpret kind
├── components/solo/SoloActions.svelte, SoloSessionSheet.svelte   # composition
├── components/solo/PlayPage.svelte           # + Threads, reachable with no session running
├── components/quicknote/JournalCaptureMenu.svelte  # new, replaces the map-move toggle
└── content/help/solo-session.md, session-journal help   # new sections
```

**Structure Decision**: Same split as specs 172 and 173. Pure rules go in the engines, orchestration and storage in `stores` and `services`, and the UI in `components/solo` and `components/quicknote`.

## Delivery slices

Each slice is one story and can ship on its own. US1 and US2 together are the most valuable first PR.

1. **US1, Yes or no (P1)**: widen the odds, `askOracle`, the answer scale, `formatOracleAnswer`, `SoloYesNoMenu` (question, likelihood, answer) and the interpret prefill.
2. **US2, Random events and tension (P1)**: event tables, `eventHappens`, `rollRandomEvent`, tension in the session record, store actions, and the event and tension controls in the menu.
3. **US3, Threads (P1)**: thread rules, the file format, `vault-threads-file`, `SoloThreadsStore`, `SoloThreadsMenu` and `SoloThreadDialog`, journal notes, and the thread subject in events.
4. **US4, Capture choices (P2)**: capture kinds, `isCaptured`, the listener change, `setCaptureChoice`, `JournalCaptureMenu`, and the scenes check in the solo store.
5. **US5, Adventure entry (P3)**: the item in `SoloOracleMenu`.
6. **Help and Cif** for all of the above, then the bundle and embeddings.

## Risks

- **The thread file is lost on a write conflict.** Writes are serialised in the store, and a failed write keeps the in-memory state and tells the player. Sync conflicts follow the vault's existing rules for files.
- **Our tables feel thin.** The tables are written for genre-neutral play with enough variety (10 × 30) and can grow without a format change.
- **Confusing "Ask Oracle" (AI) with "Yes or no" (dice).** Labels and help keep them apart. The dice oracle never says "Oracle" in its trigger.
- **Journal noise grows.** Capture choices (US4) are in this same phase.
- **Older journals.** `captureMapMoves` keeps working, and a missing `captureOff` means everything is captured.

## Complexity Tracking

None.
