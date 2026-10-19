# Research: Import a ToV Stat Block from Pasted Text

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-18

## R1. Can the import reuse `GeneratorMechanicsBundleSchema`?

**Decision**: No, not for reading. Add a separate **read result** schema in `@codex/stat-sheet-engine` where every value is optional and has no default. Only after review, when required fields are present, is the result turned into the existing `TovCreatureData` / `TovQuickNpcData` shapes and passed to `mapTovMechanicsToStatSheet`.

**Rationale**: `packages/generator-engine/src/tov-mechanics-schema.ts` puts a `.default()` on almost every field (`hp` → 22, `ac` → 12, every ability score → 10, `languages` → "—", `senses` → "passive Perception 10"). Parsing an AI transcription through it would silently turn "not in the source" into a plausible number, which is exactly what FR-006 and FR-007 forbid, and SC-003 would fail. Generators _want_ those defaults; import must not have them.

**Alternatives considered**:

- `.partial()` on the generator schema: Zod `.partial()` keeps inner `.default()`s on nested objects (`abilityScores`), so defaults still leak. Rejected.
- Strip defaults from the generator schema: changes generator behaviour (spec 3948) for no generator benefit. Rejected.

## R2. How does each value carry its state (found / check this / not found / converted / worked out from CR)?

**Decision**: The AI returns plain values plus a separate `notes` list: `{ path, state: "uncertain" | "not-in-source" | "converted", source?, original? }`. A missing or `null` value means **not found**. Local checks run after parsing and can add more notes (never remove them):

1. Dice fields that fail the dice parser → **check this**.
2. In Copy as written mode, numeric values (AC, HP, CR, ability scores, Doom, Luck) whose digits don't appear in the pasted text → **check this** ("not in the pasted text").
3. Out-of-range numbers (ability score > 30, Luck > 5) → **check this**.
4. In Copy as written mode, short text values (`languages`, `senses`, `size`, `creatureType`, `alignment`, damage and condition lists, and the `name` of each trait and action) that don't appear in the pasted text → **check this** ("not in the pasted text"). Both sides are normalised first: lower-cased, with whitespace collapsed, punctuation stripped, and ligatures and dashes folded (`ﬁ` → `fi`, `–`/`—`/`−` → `-`). Long descriptions (trait and action text) are not checked, because PDF reflow makes substring matching unreliable for them.
5. In Convert from 5e mode, a number that doesn't appear in the pasted text and has no `converted` note → **check this** (`unmarked-change`). This catches conversions the model made without saying so (SC-004).

**Rationale**: Wrapping every scalar as `{ value, state, source }` roughly triples the output tokens and makes the model worse at the transcription. A sparse notes list keeps the output close to the shape the model already produces for generators. The local checks make SC-003 enforceable without trusting the model's own claims.

**Alternatives considered**: a per-field wrapper object (too verbose, see above); trusting the model's own states with no local checks (SC-003 would rest on the model's honesty). Rejected.

## R3. Where does the logic live?

**Decision**: In `packages/stat-sheet-engine/src/stat-block-reader/` (new folder in an existing package). It holds the read result schema, prompt builder, response parser, local checks, the fallback adapter from `StatBlockIR`, conversion to ToV data, and the merge. The package takes a small injected `StatBlockReaderGateway` (`complete(prompt, systemInstruction, options) → Promise<string>`), so it has no AI or app dependency. The web app supplies the gateway by adapting the existing `ProxyAIGeneratorGateway`.

**Rationale**: Constitution I (library-first) and VIII (DI). `stat-sheet-engine` already owns stat block import (`stat-block/`) and the ToV mapping (`rules-sources/`). `generator-engine` depends on `stat-sheet-engine`, not the other way round, so the reader cannot import from `generator-engine`. No new package is needed (III, YAGNI).

**Alternatives considered**: a new `packages/stat-block-reader` workspace (an extra package for ~6 modules that only make sense next to the ToV templates; rejected); putting it in `generator-engine` (wrong dependency direction, and import is not generation; rejected).

## R4. Which AI path and settings?

**Decision**: Use `ProxyAIGeneratorGateway.complete()` without an interaction session (one-shot request, nothing stored server-side), with `generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 4096, responseMimeType: "application/json" }`. Gate the AI path on `discoveryPolicyStore.aiDisabled`. Reuse `extractJsonObject` from `@codex/runtime`.

**Rationale**: The generator default temperature (0.85) is tuned for creativity. Transcription wants determinism. The non-interaction path does not set `storeConversation`, which satisfies FR-021 (not kept). The proxy is the app's existing AI route, so no new provider and no new consent surface beyond the FR-022 notice.

**Alternatives considered**: the Interactions API with `store: false` (more moving parts for a single-turn request); a dedicated worker endpoint (new surface, no benefit). Rejected.

## R5. Input length limit (FR-005)

**Decision**: 12,000 characters, refused before any processing.

**Rationale**: A large legendary creature stat block (lair actions and spellcasting included) copied from a PDF runs roughly 4,000–6,000 characters. Foundry actor JSON for the same creature runs larger, about 8,000–10,000 once trimmed of `_stats` and `flags` noise. 12,000 covers both, and a whole PDF page of mixed content is longer than that. The limit is a named constant so the reference set (SC-002) can adjust it.

**Follow-up**: For Foundry JSON, strip known noise keys (`_stats`, `ownership`, `prototypeToken`, `effects[].icon`, `img`) before measuring and sending, so real exports fit.

## R6. Proficiency bonus when the source doesn't state it

**Decision**: When CR is found and proficiency bonus is not, work it out from CR using the standard CR-to-PB table, and mark it **found** with the note "worked out from CR". Never derive anything from a CR the GM has not confirmed.

**Rationale**: It is a fixed rule, not an estimate, and saves and skills need it. FR-006 names this as its only exception, and FR-007 gives it its own visible state.

**Alternatives considered**: leave PB not found (every save and skill roll would be wrong or blank); ask the AI (the AI might guess). Rejected.

## R7. Merging into an existing sheet (FR-017, clarification 1)

**Decision**: Build the full candidate sheet with `mapTovMechanicsToStatSheet`, then copy into the existing sheet only those sheet fields whose **source paths** are all found or GM-corrected. A fixed table maps sheet field ids to source paths. Examples:

| Sheet field             | Source paths                                                                    |
| ----------------------- | ------------------------------------------------------------------------------- |
| `ac`                    | `ac`                                                                            |
| `str_score`             | `abilityScores.str`                                                             |
| `str_save`              | `abilityScores.str`, `proficiencyBonus` (and `saveProficiencies` if non-empty)  |
| `stealth`               | `abilityScores.dex`, `proficiencyBonus` (and `skillProficiencies` if non-empty) |
| `actions` (table)       | `actions`                                                                       |
| `notes` (NPC long text) | rebuilt only from found parts; existing text is kept if no part is found        |

Fields on the existing sheet that are not in the template (the GM's custom fields) are never touched. If the existing sheet uses a different ToV template, the GM is asked to switch templates first. No cross-template merge in this slice.

**Rationale**: It reuses the one tested mapper instead of a second one, and makes "what gets overwritten" a computable list for the confirmation screen.

## R8. The AI-off fallback

**Decision**: `importStatBlock(input, { systemHint: "tales-of-the-valiant" })` → `StatBlockIR` → an adapter that produces the same read result (present values = found, missing = not found, failed dice = check this). The review and save path is shared.

**Risk**: `importStatBlock` has no end-to-end test, and `parsers/text-heuristic.ts` (589 lines) is unproven on real PDF copy. **Mitigation**: add end-to-end tests over the reference fixtures first. No accuracy target for the fallback in this slice (spec Assumptions).

## R9. Detecting 5e text in Copy as written mode (FR-010)

**Decision**: Reuse `detectStatBlockSystem()`. If it returns `dnd5e` for the pasted text, show the "looks like 5e" notice. The AI can also return a top-level `looksLike: "5e" | "tov" | "unknown"`; either signal triggers the notice.

## R10. Recording "converted from 5e" (FR-020)

**Decision**: Add the existing Label mechanism value **"Converted from 5e"** to the entity (Constitution XII: labels, not tags). No schema change.

**Alternatives considered**: a new `statSheet.provenance` field (schema and migration change for one flag; rejected).

## R11. "Keep the original text in notes" (FR-021)

**Decision**: When ticked, append a fenced "Original stat block" section to the entity's markdown body (`content`) on save. When the vault is shared or published, the warning text says the body is included. No new storage.

## R13. Category for a new entity (FR-018)

**Decision**: Reuse `resolveEntityType` from `generator-engine` (exported from its index). Use the `"creature"` generator id for monsters and `"npc"` for quick NPCs, passing the vault's category ids as the generators do. If the vault has neither category, fall back to its first category with a character-like id (`character`, `npc`, `creature`), else to the vault's default category.

**Rationale**: New entities land where generated ones of the same kind already land, so GMs see one consistent rule. `generator-engine` is an app-level dependency already, and the call happens in the web controller, not in `stat-sheet-engine`, so there's no dependency cycle.

## R14. AI timeout

**Decision**: `readStatBlockWithAi` aborts after 30 seconds and throws `StatBlockReadError` (`reason: "timeout"`). The plan's 10-second figure is the typical target, not the limit.

**Rationale**: FR-013 needs a failure the GM can act on. 30 s leaves room for long legendary creatures on a slow connection without leaving the GM waiting indefinitely.

## R12. Entry points and file sizes (Constitution XIV)

- `DetailStatsTab.svelte` (241 lines) gets an **Import** header button. It fits the tab's "stat sheet header actions" job.
- `StatSheetEditor.svelte` (712 lines) is **not** touched. The spec's "in the stat sheet area" is met by the tab header.
- `VaultControls.svelte` (674 lines) and `MobileCreateEntitySheet.svelte` (343 lines) each get one entry that opens the import. In VaultControls this is a single button inside the existing new-entity form, which belongs to that form's responsibility (starting a new entity). The import UI itself lives in new files.
- `modal-ui.svelte.ts` (559 lines) gets one `statBlockImport` open state plus open/close methods. It keeps its single responsibility of tracking which global modal is open. That is the stated justification for touching a file over 500 lines.
