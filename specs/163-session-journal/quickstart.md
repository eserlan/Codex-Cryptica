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

**Story 4 — cloud backup survives**: With a vault that has cloud backup enabled and a journal containing entries and a section, trigger a backup, then restore that backup into a new vault (existing cloud-backup UI flow) → confirm the journal appears in the restored vault with every entry/section intact and in order. Separately, confirm the cloud backup consent screen's "What gets stored" copy now names session journals.

**Story 5 — global access (slice 2)**: With no journal, open any non-Notes view (e.g. the graph) → find the Session Journal control in the Activity Bar → label reads "Start Session Journal" and no active indicator is shown → select it → the scratchpad opens on the Journal tab at its Start screen and no journal has been created yet. Start one, add a note, close the panel → the control now reads "Open Session Journal" with an active indicator. Navigate to two other views and select the control from each → the same journal, entries and sections open on the Journal tab. Reload → the control reads "Resume Session Journal"; select it → the journal opens straight to its entries and the control becomes "Open Session Journal". Reopen the panel with Ctrl/Cmd+I and confirm it opens on the Journal tab (the tab is remembered) and that opening the journal from the control did not create a blank Quicknote note. On a phone-width viewport, confirm the control is in the menu drawer. In guest mode, confirm the control is absent. Switch vaults and confirm the control shows the other vault's state.

**Story 6 — automatic capture (slice 3)**: Start a journal and leave the Quicknote panel closed. Roll 2d6+3 in the dice roller, type `/roll 1d20` in the Oracle chat, roll on a random table (and re-roll one part of a result), draw from a deck (try a reversed card), and roll a stat sheet field. Open the journal → each result appears once, in the order made, marked as automatic with a label and icon that differ from a typed note; card draws name the cards, table results name the table. Add a typed note between two rolls and confirm the order. Create a section, make a roll → it lands in that section. Make ten rolls quickly → all ten appear, none missing or doubled. Then end the journal and roll again → nothing is added, nothing is shown, and the roll behaves as normal. With no journal ever started, roll → no journal appears and no message is shown. Reload mid-session → captured entries are still there. In guest mode, roll → nothing is captured.

**Story 7 — turn journal content into entities (slice 4)**: Start a journal, add two typed notes, create a section and add a note and a couple of rolls under it, then end the session. Right after ending, confirm the view offers "Turn into a Note" and "Choose parts", and that ignoring them leaves the ended journal as it was. Then: (1) "Make entity" on one entry (the button beside each entry is always visible; the whole-journal, choose-parts and section buttons are behind the small "Make entity" toggle beside the journal title) → pick Event, keep the suggested name → Create → the panel closes and a draft Event with that text opens for review; approve or discard it. (2) "Make entity" on the section → a draft whose body lists that section's entries with times, the roll marked as a "Dice roll". (3) "Turn journal into a Note" → a draft Note named after the journal, with the section as a heading. (4) "Choose parts", tick one entry and one whole section that contains another → Create → one draft with each entry once, in order. Reopen the journal → every entry and section is exactly as before. Repeat step 1 → a second draft is created. Try a blank name → blocked with a message. Try "Turn journal into a Note" on a brand-new empty journal → disabled with a reason. Open a past journal from history → the same choices are there. Use the keyboard only for one promotion (Tab to the button, Enter, fill the form, Enter on Create) and confirm focus returns to where it started, and that pressing Escape in the form closes only the form and leaves the scratchpad open. After each Create, confirm a "Created a draft" message appears. Discard every draft you make when you are done.

## Verifying the vault-scoping and single-active-journal invariants (FR-012, FR-013)

- Switch vaults (if more than one exists locally) and confirm the journal control and any active journal do not follow you to the other vault — each vault sees only its own.
- With a journal already active, trigger "start" again (e.g. via whatever UI path would otherwise create a second one) and confirm it opens the _existing_ active journal rather than creating a second, concurrent one.

## What this slice does not cover (do not test for it here)

- (Slice 1 note, now superseded) The global cross-view control is slice 2, Story 5 above.
- (Slice 1 note, now superseded) Automatic capture is slice 3, Story 6 above.
- (Slice 1 note, now superseded) Promote-to-entity is slice 4, Story 7 above.
- No delete capability for a journal (spec Assumption — out of scope for this slice).
