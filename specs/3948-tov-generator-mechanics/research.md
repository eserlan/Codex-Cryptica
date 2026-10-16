# Research & Architectural Decisions: ToV Generator Mechanics

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-10-15  
**Status**: Completed

---

## Decision 1: Generator Mechanics Representation & Pipeline

### Decision

Extend the generator output pipeline with an optional, typed `mechanics` bundle rather than creating separate ToV generator variants. The narrative generation remains primary and system-neutral; when `gameSystem === "tales-of-the-valiant"` is active, the prompt instructs the AI model to include a structured `mechanics` JSON block adhering to BFRD schemas alongside standard lore, summary, and traits.

### Rationale

- Adheres directly to Constitution Principle I (Library-First) and III (Simplicity & YAGNI).
- Satisfies the core goal of Issue #3948: "No ToV-only fork of any generator."
- Keeps narrative flavour, personality, and worldbuilding clean and separable from system-specific mechanics.
- Enables future system profiles (e.g. 5e, PF2e) to follow the exact same pattern without rewriting UI or generator dispatching.

### Alternatives Considered

- _Separate ToV-only generators (e.g. `tov-npc`, `tov-creature`)_: Rejected because it violates the "no-fork" mandate, duplicates existing genre/flavor options, and fragments the UI into redundant generator catalog entries.
- _Post-generation mechanical enrichment pass_: Having one LLM call generate lore and a secondary call generate stats. Rejected due to latency, double token cost, and potential divergence between the creature's described traits and its mechanics.

---

## Decision 2: Option Integration & Vault Profile Inheritance

### Decision

Add `gameSystem` as a first-class select option to `npc`, `creature`, `magic-item`, and `minor-magic-item` in `packages/generator-engine/src/campaign-generator-registry.ts`.

- Choices: `[ { value: "generic", label: "System Neutral" }, { value: "tales-of-the-valiant", label: "Tales of the Valiant" } ]`.
- For `npc`, add a secondary dependent option `npcDetail` ("Quick NPC" vs "Full Leveled Character") guarded by `visibleWhen: { optionId: "gameSystem", values: ["tales-of-the-valiant"] }`.
- Default value resolution follows transparent precedence: explicit user option in form > active campaign vault's `systemProfileId` (via `systemProfileStore`) > `SYSTEM_NEUTRAL_ID` (`"generic"`).

### Rationale

- `GeneratorOptionDefinition` already natively supports `visibleWhen` in `GeneratorConfigForm.svelte`.
- Integrates seamlessly with `systemProfileStore` from #3943.
- Works consistently for both public SEO pages (where vault context is null, defaulting to neutral) and campaign vaults (which pre-select ToV if the vault is set to ToV).

### Alternatives Considered

- _Hardcoding a global UI switch outside the generator options_: Rejected because generator options are already serialized in presets, URL params, and draft metadata.
- _Only offering Quick NPCs_: Rejected in clarification session; GMs occasionally need major allied heroes or recurring villains with full PC classes and talents.

---

## Decision 3: Template Binding & Stat Sheet Population

### Decision

Create a dedicated mapper in `packages/stat-sheet-engine` (e.g. `mapTovMechanicsToStatSheet`) that converts structured `TovNpcMechanics`, `TovCharacterMechanics`, or `TovCreatureMechanics` into the native `StatSheetData` format matching `builtin-tov-npc`, `builtin-tov-character`, or `builtin-tov-monster` (shipped in #3944).

- The generator's `mapOutputToDraft` automatically populates `draft.statSheet` and sets `draft.systemId = TOV_SYSTEM_ID`.
- When saved, `CampaignGeneratorPersistenceService` passes `statSheet` and `systemId` directly into `vault.createEntity`.
- For magic items, mechanics are formatted into the entity's Markdown body under a dedicated `## Game Statistics` heading and stored in entity metadata, with no stat sheet attached (per Clarification Session 2026-10-15).

### Rationale

- Directly leverages the battle-tested stat sheet infrastructure without reinventing character sheet UI.
- All dice expressions (e.g. `1d20 + 5`, `2d6 + 3`) are populated into standard dice fields, giving users instantaneous click-to-roll functionality in the sheet, Zen view, and VTT token inspector.
- Preserves full editability: the user can tweak HP, AC, or add actions in the stat-sheet editor after saving.

### Alternatives Considered

- _Storing mechanics purely as raw markdown table and parsing on demand_: Rejected because it requires fragile regex parsers and loses interactive counters (HP, Luck, Doom) and click-to-roll action tables.

---

## Decision 4: Deterministic Fallback & Offline Behavior

### Decision

In offline mode or when AI is disabled, generator runs produce standard system-neutral content and attach an informational notice that system-specific mechanics require AI mode (per Clarification Session 2026-10-15).

### Rationale

- Avoids shipping thousands of lines of fragile static monster/character tables in the client bundle.
- Conforms to user-selected resolution (Option B).
- Gracefully degrades without crashing or corrupting data.

---

## Decision 5: Public Standalone Generator Handoff & Clipboard

### Decision

On public generator pages (`/generators/npc`, `/generators/creature`, `/generators/magic-item`):

- The Game System selector is visible and defaults to "System Neutral".
- Selecting "Tales of the Valiant" displays the generated stats in the output review card.
- "Copy" formats both the narrative description and the BFRD stat block cleanly into standard Markdown.
- "Save to Campaign" preserves the generated mechanics in `sessionStorage` / `__codex_pending_import` so they are imported as a complete entity with stat sheet when the user opens or creates a vault.

### Rationale

- Increases public engagement and SEO relevance for Tales of the Valiant players.
- Completely reuses the existing `generator-save-flow.ts` and `generator-page-handoffs.ts` infrastructure.
