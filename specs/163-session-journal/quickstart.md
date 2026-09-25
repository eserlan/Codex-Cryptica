# Quickstart: Session Journal (data model, persistence & lifecycle)

## Local dev loop (engine side)

1. New package `packages/session-journal-engine` — develop and unit-test the lifecycle/ordering/validation logic first, in isolation, with plain Vitest (no Svelte, no IndexedDB). Follow `packages/chronology-engine`'s shape (`src/types.ts`, `src/engine.ts`, `src/index.ts`, `tests/`).
2. `bun run test` inside the package directory as you go; this is where FR-005 (empty section name rejection), FR-007 (no entries after end), and FR-013 (one active journal per vault) get their tightest, fastest coverage.

## Local dev loop (store + UI side)

1. Wire `packages/session-journal-engine` into `apps/web/src/lib/stores/session-journal.svelte.ts`, following `apps/web/src/lib/stores/calendar.svelte.ts`'s shape: `$state` for the loaded journal, constructor DI of `vaultRegistry` (default: the real singleton) and `idb.ts` access, delegating every decision to the engine.
2. Add the `session_journals` object store to `CodexDB` in `apps/web/src/lib/utils/idb.ts` (bump `DB_VERSION`, guard with `objectStoreNames.contains`, add the `by-vault` index) — see `data-model.md` for the exact shape.
3. Add the three-state control (Start/Open/Resume) to `apps/web/src/lib/components/quicknote/QuickNoteScratchpad.svelte`, and a minimal journal view (entry list, add-note field, section create/rename) as a new sibling component in the same directory.
4. Unit-test the store by mocking `getDB()` from `../utils/idb`, following `calendar.test.ts`'s in-memory `Map`-backed fake — no `fake-indexeddb` needed.

## Manually verifying each user story

**Story 1 — start and add notes**: Open Quicknote/Scratchpad with no journal active for the vault → see "Start Session Journal" → start it → add two or three notes → confirm they render in order with timestamps, and Quicknote's own transient notes are unaffected.

**Story 2 — sections**: In an active journal, create a section, add a note, rename the section, add another note → confirm both notes are readable, the rename is reflected, and a fresh journal with zero sections still works exactly as Story 1.

**Story 3 — end and resume**: Add entries and a section, end the journal → reload the app → confirm the ended journal and its content are still present and read-only (no way to add further entries to it — FR-007). Separately: start a new journal, add entries, reload the app _without_ ending it → confirm the control reads "Resume Session Journal" and reopening shows every entry/section intact.

## Verifying the vault-scoping and single-active-journal invariants (FR-012, FR-013)

- Switch vaults (if more than one exists locally) and confirm the journal control and any active journal do not follow you to the other vault — each vault sees only its own.
- With a journal already active, trigger "start" again (e.g. via whatever UI path would otherwise create a second one) and confirm it opens the _existing_ active journal rather than creating a second, concurrent one.

## What this slice does not cover (do not test for it here)

- No global/cross-view indicator — the control lives only in Quicknote/Scratchpad (#3407).
- No automatic capture of dice rolls, cards, or table results (#3408).
- No promote-to-entity conversion (#3409).
- No delete capability for a journal (spec Assumption — out of scope for this slice).
