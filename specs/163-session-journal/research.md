# Phase 0 Research: Session Journal (data model, persistence & lifecycle)

## Decision: Store shape — one `$state`-bearing class, not the Oracle 6-manager split

**Decision**: `SessionJournalStore` is a single `$state`-bearing class in `apps/web/src/lib/stores/session-journal.svelte.ts`, constructor-injected with `vaultRegistry` and a persistence service, exported as both the class and a default singleton (Constitution VIII).

**Rationale**: The Oracle store's 6-manager decomposition (`ui`, `chat`, `context`, `actions`, `settingsManager`, `reconciliation`) exists because Oracle accumulated genuinely separate concerns over many features. Session Journal (this slice) has one concern — journal lifecycle and entry/section CRUD — so a single class is the right size, matching `QuickNoteStore`'s precedent (`apps/web/src/lib/stores/quicknote.svelte.ts`) rather than Oracle's.

**Alternatives considered**:

- Multi-manager split from day one — rejected as premature; nothing in this slice's scope (FR-001–FR-015) has more than one responsibility yet. Constitution XIV (Bounded Responsibility) argues for splitting when a file _accumulates_ unrelated concerns, not for pre-splitting a small one.

## Decision: Persistence — shared `idb`-backed `CodexDB`, not a separate Dexie database

**Decision**: Add a `session_journals` object store to the existing shared `CodexDB` schema in `apps/web/src/lib/utils/idb.ts` (bump `DB_VERSION`), keyed by `id` (string), with a `by-vault` index on `vaultId` — mirroring the existing `canvases` store exactly (`keyPath: "id"`, `store.createIndex("by-vault", "vaultId")`).

**Rationale**: Two persistence patterns coexist in this codebase: the shared `idb`-based `CodexDB` (used by `calendar.svelte.ts`, `dice_history`, `canvases`, etc.) and a separate Dexie database (`entity-db.ts`, used only by Quicknote and graph entities). The shared `idb` pattern is the more common, more recent, and better-tested-in-isolation of the two (see Testing decision below), and nothing about Session Journal's data shape (a handful of small records per vault) needs Dexie's richer query surface. Following `calendar.svelte.ts` keeps this feature consistent with the majority pattern rather than adding a third persistence mechanism.

**Alternatives considered**:

- Reuse Quicknote's Dexie `entityDb` — rejected. Session Journal is conceptually adjacent to Quicknote in the UI but is not "a kind of quicknote" in the data model (it has sections, a lifecycle, and different entry types), so piggybacking on Quicknote's table would conflate two schemas the spec explicitly keeps distinct (spec's design intent: "these are different mental models").

## Decision: Pure logic lives in a new `packages/session-journal-engine` workspace package

**Decision**: Create `packages/session-journal-engine` (mirroring `packages/chronology-engine`'s shape: `src/types.ts`, `src/engine.ts`, `src/index.ts`, `tests/`) holding pure, framework-free logic: lifecycle transitions (start/resume/end, with the "one active journal per vault" invariant from FR-013), section creation/rename validation (FR-005's empty-name rejection), and entry/section ordering. `apps/web/src/lib/stores/session-journal.svelte.ts` is thin glue: holds `$state`, calls into `session-journal-engine` for any decision logic, and persists via `idb.ts`.

**Rationale**: Constitution Principle I requires standalone-package extraction for "major features," and this slice has real, unit-testable business rules (three-state lifecycle, name validation, chronological ordering with sections) worth testing without Svelte or IndexedDB in the loop — exactly the shape `chronology-engine` extracted from `calendar.svelte.ts`. Quicknote's simpler status-only transitions (active/archived/elevated, no cross-record invariants) didn't warrant a package; Session Journal's do, because FR-013 requires the store to answer "is there already an active journal for this vault" and reason about lifecycle state independent of any UI action.

**Alternatives considered**:

- Logic directly in `session-journal.svelte.ts` (Quicknote's approach) — rejected because it would make lifecycle-transition and ordering rules untestable without mocking IndexedDB/Svelte reactivity, and the spec's edge cases (FR-005 rename rejection, FR-013 single-active-journal, FR-007 no-entries-after-end) are exactly the kind of pure-function rules the engine/store split exists to isolate.

## Decision: Vault scoping — read `vaultRegistry.activeVaultId` directly

**Decision**: `SessionJournalStore` takes `vaultRegistry` (`apps/web/src/lib/stores/vault-registry.svelte.ts`) via constructor injection, same as `QuickNoteStore` and `calendar.svelte.ts`, and reacts to `vaultRegistry.activeVaultId` changes via `$effect` to reload/scope journal data (satisfies FR-012).

**Rationale**: This is the established, only pattern for vault-scoped stores in the codebase — no alternative exists or is needed.

## Decision: Entry-append API shape anticipates future event-driven callers

**Decision**: The store's entry-append method takes a plain data object (`appendEntry(journalId: string, entry: JournalEntryInput)`) rather than anything tied to a UI event (e.g. a DOM event or a component instance).

**Rationale**: Slice 3 (#3408, automatic capture) will call this same append path from `@codex/events`' `AppEventBus` listeners (`appEventBus.subscribe("dice:*", ...)` etc.), which only have access to the event's `payload`, not UI context. Shaping the API this way now means #3408 wires a listener that calls the existing method — no store-side change needed later. This slice does **not** depend on `@codex/events` or wire any subscriptions; it only avoids an API shape that would need to change when #3408 lands.

**Alternatives considered**:

- Component-driven-only API (e.g. accepting a Svelte event) — rejected, would need a breaking change in slice 3.

## Decision: Testing — mock `idb.ts`'s `getDB()`, no `fake-indexeddb`

**Decision**: Unit tests for `session-journal.svelte.ts` mock `getDB()` from `../utils/idb` with an in-memory `Map`-backed fake (`get`/`put`/`delete`), following `calendar.test.ts`'s pattern exactly. Pure logic in `session-journal-engine` is tested with plain Vitest, no mocking needed at all.

**Rationale**: Matches the most recent, smallest precedent in the codebase for an `idb.ts`-backed store's test suite. `fake-indexeddb` exists as a devDependency but isn't used by the store this plan mirrors most closely; introducing it here would be an unjustified inconsistency for no behavioral gain in this slice's scope.
