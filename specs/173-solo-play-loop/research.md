# Research: Solo Play Loop

Checked against `staging` at `9ddfa4562` (2026-10-08). Paths are relative to the repository root.

## R1. Recording generated results in the journal (FR-008)

**Decision**: The generator modal publishes the existing `JOURNAL:CAPTURE` event when a draft reaches review, and again when it is saved, through a new framework-free formatter in `packages/session-journal-engine/src/capture.ts`: `formatGeneratedResult({ generatorId, title, summary })` produces entry type `generated-result`, and `formatGeneratedSaved({ title, category })` produces `generated-saved`. The two calls in `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` go through a small publisher module, `apps/web/src/lib/services/generator-journal-capture.ts`, so the modal gains about three lines.

**Rationale**: `captureToEntryInput` accepts any entry type ("Unknown entry types are accepted unchanged"), and `session-journal-capture.ts` already writes every `JOURNAL:CAPTURE` into the running journal or drops it when none runs. Dice, tables, decks and map moves use the same path. A saved generator result is noted as a second, short entry ("Saved Mara One-Eye to the Vault as a Character") rather than by editing the first one. Journal entries are append-only, and editing would need a new journal mutation. The spec's FR-008 wording is adjusted to "noted in the journal".

**Alternatives considered**: A callback prop from the solo bar into the modal. Rejected: the modal is global (`GlobalModalProvider`), so solo would have to reach into it, and generation should be journaled from any entry point, not just the bar. Editing the original entry on save. Rejected: entries are immutable today.

**Bounded responsibility**: `CampaignGeneratorModal.svelte` is 814 lines. It keeps its responsibility (running a generator workflow) and gains only two publisher calls; formatting and publishing live in the new modules.

## R2. Opening a generator from the bar (FR-006, FR-007)

**Decision**: `modalUIStore.openGeneratorWorkflow(generatorId)` with `npc`, `encounter`, `rumour` and `plot-twist` (the Complication), plus "All generators…", which calls `openGeneratorWorkflow(null)` to show the full picker (clarification). Availability uses the existing `isVaultReadyForGenerators(vault)`. When unavailable, the menu items are disabled with the reason "Generators open once your vault has loaded."

**Rationale**: These generator ids exist in `packages/help-engine/src/registry/generators.generated.ts`, and the workflow already opens at a given generator. No generator UI is duplicated.

## R3. Pinned table rolls (FR-010 to FR-013)

**Decision**:

- Pins are stored per vault in `localStorage` under `codex-solo-table-pins:<vaultId>` as an array of up to 3 table ids. They live in a new `SoloTablePinsStore` (`apps/web/src/lib/stores/solo-table-pins.svelte.ts`), with the same injected `StorageLike` pattern as the solo session.
- Rolling uses `randomSourceStore.roll(source)`.
- The recording step in `components/random/TableRoller.svelte` (`record(result)`, which calls `diceHistory.addResult(…, "table", { label, source })`) moves into a shared helper, `apps/web/src/lib/services/record-table-roll.ts`. `TableRoller` and the bar's pinned rolls both call it, so FR-012 ("captured exactly as from the tables screen") holds by construction.
- Pins resolve against `randomSourceStore.tables`. Unknown ids are skipped and pruned on the next write.

**Rationale**: Constitution III (reuse, no duplication). The table screen's capture path is the canonical one.

**Alternatives considered**: Storing pins in the solo session record. Rejected: pins outlive a session, and the player expects them next time.

## R4. Recent results and Save to Vault (FR-001 to FR-005)

**Decision**: Recent results are read from `sessionJournalStore.current.entries`. A pure selector, `recentResults(entries, limit = 10)` in `packages/session-journal-engine/src/recent.ts`, returns the newest entries first, excluding the bookkeeping entries `party-change` and `generated-saved`.

Save to Vault uses a second instance of the existing `SessionJournalPromoter`, `soloPromoter`, built with the scope `{ kind: "entry", entryId }`. Its `openEntity` and `closePanel` are no-ops, so the player stays on the current screen (FR-002), and `notify` shows "Created a draft: …". Category suggestions come from a pure `suggestCategory(entryType, generatorId, categoryIds)` in `solo-session-engine`: npc → character, rumour → note, encounter → event or note, and anything else → note. The player can change it.

**Rationale**: The promoter already creates a draft with the entry content and a `discoverySource` link back to the journal (FR-003), validates the name (FR-004) and fails cleanly. Only the "open the entity" side effect is unwanted in solo play, and dependency injection makes that a configuration choice.

## R5. Party (FR-014 to FR-017)

**Decision**: The solo session record gains `partyIds: string[]` (at most 12). The record stays `version: 1`, and a record without `partyIds` parses as `[]`, so Phase 1 sessions keep working. Store methods `setParty(ids)` record a `party-change` journal entry through `formatPartyChange({ joined, left })` in `session-journal-engine`. The setup dialog gains an optional party picker, and the bar shows the party with a picker. Members resolve against the vault's entities of category `character`; missing ids are dropped from display, and pruned on the next write.

## R6. Scene history (FR-022 to FR-024)

**Decision**: The session record gains `scenes: { name, sectionId | null }[]` (at most 100), in order. The current scene is always the last item, because returning to a scene appends a numbered visit (clarification). Phase 1's `setScene` appends to `scenes`, and `renameScene` updates the current item. New store method `returnToScene(index)`: per the clarification, it starts a new visit. It calls `setScene(name + " (n)")`, where n is the next visit number for that base name, so a new section is created and appended to `scenes`, and the earlier section is left as it is. Opening a scene calls `quickNoteStore.openJournal({ sectionId })`, which sets a new optional section filter shown in `SessionJournalView.svelte` with a "Show all" control. A record without `scenes` parses as one scene built from its `sceneName`, if there is one.

**Rationale**: Journal sections already are the record of scenes (Phase 1, FR-024). The list only needs order and names in the session, and the journal view only needs a filter.

## R7. Oracle shortcuts (FR-018 to FR-021)

**Decision**: A pure builder in `solo-session-engine`, `buildOracleShortcutPrompt(kind, context)`, returns text such as:

> How does this NPC react?
> Context: scene "The flooded crypt", place "Greyhollow", party Kael and Brother Ivo. Recent: "Tavern patrons → a one-eyed smuggler"; "d20 → 14".

The recent part takes at most 10 results, each clamped to 120 characters, and the whole prompt is clamped to 1,200 characters. The shortcut kinds are `npc-reaction`, `complication`, `place-knowledge` and `what-next`. None asks the Oracle to run the game.

The Oracle's `ui` manager (`apps/web/src/lib/stores/oracle/ui-manager.svelte.ts`, which AGENTS.md names as the place for Oracle UI state) gains `pendingPrompt: string | null` and `setPendingPrompt(text)`. `OracleChat.svelte` copies it into its local `input` when it is set, focuses the textarea and clears it. Nothing is sent until the player submits. The shortcuts open the Oracle sidebar as Phase 1's Ask Oracle does.

**Rationale**: FR-019 says "never sends", and an editable prefill is the plain way to make that true. It also lets the player add the detail only they know.

## R8. Where the new controls go (FR-026)

**Decision**: The desktop bar keeps one line:

`[map] [scene ▾] [quick roll] [pinned 1–3] [Generate ▾] [Recent ▾] [Party ▾] [Oracle ▾] [More dice] [Journal] [Map] [Add note] [End] [–]`

- Scene, Generate, Recent, Party and Oracle are small popover menus. Oracle becomes a menu holding "Open Oracle" and the four shortcuts.
- The action group already scrolls horizontally when space runs out.
- The phone sheet lists every item as a full-width row, grouped as Play (roll, tables, generate), Story (scene list, party, recent results) and Tools (Oracle, dice, journal, map, note), then End.

Each popover is its own component: `SoloSceneMenu`, `SoloGenerateMenu`, `SoloRecentResults`, `SoloPartyMenu`, `SoloOracleMenu` and `SoloPinnedTables`. That keeps `SoloActions.svelte` (133 lines) as a composition.

## R9. Cif and help (FR-029)

**Decision**:

- In `packages/help-engine/src/actions/catalogue.ts`, add controls `solo-generate-menu`, `solo-recent-results`, `solo-pinned-tables`, `solo-party-menu`, `solo-scene-menu` and `solo-oracle-menu` (area `solo`, `requiresFlag: "solo-session"`; the Oracle menu only while AI is on).
- `help-context.svelte.ts`'s `soloActionsFor` lists them while a session runs.
- Extend the `solo-session` article with sections for each, add workflows to `registry/features/solo-session.ts`, and add five eval questions.
- Regenerate embeddings.

## R10. Privacy (FR-027, SC-005)

**Decision**: The only path to the AI service is the player submitting an Oracle question. The shortcut builder runs locally and only fills the input. Pins, party and scenes stay in `localStorage`. A source-scan test (pattern from Phase 1's guard test) asserts that no new solo module calls `fetch`, `sendBeacon` or `WebSocket`.
