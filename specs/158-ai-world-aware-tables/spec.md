# Feature Specification: AI-Generated World-Aware Random Tables

**Feature Branch**: `158-ai-world-aware-tables`  
**Created**: 2026-08-15  
**Status**: Draft  
**Input**: GitHub Issue #2250 — "AI-generated world-aware random tables" (Follow-up expansion to #2247 / `157-random-tables-decks`)

## Overview

Generic AI table generation produces clichéd, disconnected lists (e.g., standard d20 fantasy tropes). In Codex Cryptica, a random table should be a living lens on the user's specific campaign world.

When a user asks to generate a table (e.g., "Docklands Encounters"), the generation engine retrieves relevant context from the active vault (factions, NPCs, locations, concepts), pins user-introduced proper nouns with high priority, emits `{sub_table_ref}` tokens when matching nested tables already exist, and stages the generated entries into the interactive table preview surface. Users can vet, edit, or reject each generated row before anything is committed to their vault.

This feature is strictly additive and opt-in: all random table authoring, rolling, and offline mechanics from #2247 remain 100% functional without AI or network connectivity.

## Clarifications

### Session 2026-08-15

- **Q: How does generation handle new vs. existing tables?**  
  → **A:** The generation dialog is accessible from both the table creation workflow (creating a brand new table) and the table editor (generating additional rows to append to an existing table).
- **Q: Does table generation introduce a new data model or special AI provenance flags?**  
  → **A:** No. Generated entries are standard `TableEntry` rows in standard tables. Once accepted, they are ordinary user content that can be manually edited, re-weighted, or deleted.
- **Q: Where do generated rows appear before being saved?**  
  → **A:** Generated entries always route through the existing batch import review preview table (`packages/random-source-engine`), allowing per-row acceptance, inline editing, and exclusion.
- **Q: How does the generator discover sub-table references?**  
  → **A:** The system injects the list of existing vault table and deck names into the generator prompt context, instructing the model to emit `{table_name}` tokens whenever a generated outcome naturally aligns with an existing table.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a World-Grounded Random Table (Priority: P1)

A GM is preparing an urban district and wants a "Smuggler's Cove Rumors" table. In the table creator, they enter their prompt and optional campaign guidance. The generator analyzes the vault, identifies relevant local factions, shady contacts, and landmarks, and produces 10-20 distinct rows explicitly naming those vault entities (e.g., "A courier bearing the wax seal of House Vane seeks passage").

**Why this priority**: Core value proposition. Generates rich, personalized table content grounded in the user's actual vault entities instead of generic fantasy tropes.

**Independent Test**: Trigger generation with an active vault containing known entities; verify the returned rows explicitly reference those entities and match the requested theme.

**Acceptance Scenarios**:

1. **Given** an active vault with entities and an AI provider configured, **When** the user clicks "Generate entries" and provides a theme prompt, **Then** the engine retrieves relevant vault entities and generates thematic table rows referencing those entities.
2. **Given** freeform user instructions in the campaign context field, **When** generation runs, **Then** user-supplied instructions and names take highest priority over default category inferences.
3. **Given** offline mode or disabled AI, **When** the user views the table editor, **Then** manual authoring and import work completely without error, and AI generation controls clearly indicate offline/disabled state.

---

### User Story 2 - Sub-Table Reference Emission (Priority: P1)

The GM already has tables named `weather_event`, `docklands_crew`, and `minor_loot`. When generating the "Smuggler's Cove Rumors" table, the generator emits entries containing nested references like `"Spotted a {docklands_crew} unloading contraband during a {weather_event}"`.

**Why this priority**: Unlocks recursive depth and compounds world-building value by automatically linking new tables into the user's existing table web.

**Independent Test**: With existing tables in the vault, generate a parent table on a related topic and verify `{existing_table_name}` tokens are emitted for exact matching table names.

**Acceptance Scenarios**:

1. **Given** existing random tables in the active vault, **When** generating new table entries, **Then** the prompt context provides existing table identifiers and the output includes valid `{table_name}` references.
2. **Given** generated entries with `{table_name}` references, **When** accepted and rolled, **Then** the references resolve dynamically using the standard nested table evaluation engine.
3. **Given** no relevant existing tables, **When** generation runs, **Then** plain descriptive text is emitted without malformed or hallucinated reference tags.

---

### User Story 3 - Interactive Row Review in Import Preview (Priority: P1)

After the AI generates rows, they are not written directly to the vault. Instead, the user is presented with the interactive Import Preview table. The user can toggle rows on/off, edit the text of specific rows, adjust assigned weights/ranges, and click "Accept" to insert them into the table.

**Why this priority**: Eliminates AI hallucination anxiety and guarantees human-in-the-loop curation. Reuses the robust review surface built in #2247.

**Independent Test**: Generate a batch of rows, modify one row's text, deselect another row, click accept, and verify only selected and modified rows are committed to the table.

**Acceptance Scenarios**:

1. **Given** generated table output from the AI service, **When** the generation completes, **Then** the results are loaded into the interactive row preview modal.
2. **Given** generated rows in the preview, **When** the user edits a row's text or deselects a row, **Then** only the accepted rows with the updated text are added to the table.
3. **Given** generating for an existing table with 5 rows, **When** 10 generated rows are accepted, **Then** the resulting table contains 15 rows with coherent weight/range assignments.

---

### User Story 4 - Entity Mention Recognition & Quick-Link (Priority: P2)

When rolled results mention entities from the user's vault, the user can click or hover the entity name to open its quick preview card or navigate to the entity detail in the vault.

**Why this priority**: Tightens the loop between rolling a table result and jumping into the relevant lore during live session play.

**Independent Test**: Roll a generated result containing a vault entity name; verify clicking the entity name navigates to or inspects that entity.

**Acceptance Scenarios**:

1. **Given** a rolled result containing entity references, **When** viewing the roll result in the session or history, **Then** recognized entities are styled as interactive entity links.
2. **Given** an entity link in a roll result, **When** clicked, **Then** the application opens the entity detail panel or Zen mode.

---

### User Story 5 - Anti-Determinism and Content Variety (Priority: P2)

A GM generates multiple batches of encounter entries for the same district. The generator applies temperature and anti-determinism heuristics to ensure successive runs do not repeat identical phrasing, structures, or archetype formulas.

**Why this priority**: Prevents repetitive "AI slop" and formulaic table outputs across repeated generations.

**Independent Test**: Generate two consecutive batches with the same prompt and compare output similarity metrics to ensure structural diversity.

**Acceptance Scenarios**:

1. **Given** repeated generation requests with the same topic, **When** batches are generated, **Then** entries exhibit syntactic and thematic variety without duplicated templates.

---

### Edge Cases

- **Empty Vault**: When generating in a brand new vault with 0 entities, the generator falls back smoothly to generating cohesive contextual entries based solely on user prompt and instructions.
- **Large Vault Context**: When a vault has thousands of entities, `search-orchestrator` ranks and slices the top most relevant entities so the prompt remains well within token budgets.
- **Invalid Reference Tokens**: If the AI emits a reference `{non_existent_table}`, the import preview flags it or standard table fallback handles it gracefully as an unresolved token during rolls.
- **Rate Limit or Network Failure**: If an LLM call fails, an intelligible notification appears, and no partial or corrupt rows are committed.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Generate entries" action within the Table Editor and Table Creation interfaces.
- **FR-002**: System MUST retrieve relevant entities from the user's active vault using search orchestration grounded on the generation prompt and active world context.
- **FR-003**: System MUST enforce user prompt priority using the campaign-context prioritization structure, ensuring user-specified constraints outrank default category inferences.
- **FR-004**: System MUST inject available table and deck names into generation context and instruct the model to produce `{sub_table}` references when appropriate.
- **FR-005**: System MUST route generated candidate rows into the interactive table import preview surface before saving.
- **FR-006**: Users MUST be able to edit, toggle/skip, or accept individual candidate rows in the preview.
- **FR-007**: System MUST support appending accepted generated rows to an existing table without overwriting prior entries.
- **FR-008**: System MUST maintain 100% offline functionality for manual table creation, editing, importing, and rolling when AI is unavailable or disabled.
- **FR-009**: System MUST NOT alter the underlying `TableDefinition` or `TableEntry` data schema to introduce AI-specific flags or dependencies.
- **FR-010**: System MUST link recognized vault entity mentions in roll results to their respective entity records.

---

### Key Entities

- **TableGenerationPrompt**: The input parameters for generating table entries, including prompt text, entry count, campaign context, and active vault scope.
- **CandidateTableEntry**: A transient, uncommitted generated row containing raw text, inferred weight/range, and identified entity/sub-table references pending user approval.
- **TableDefinition**: The persistent table model (from #2247), containing the finalized list of `TableEntry` objects.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Generation of a 10-20 row world-grounded table completes and presents the review preview within 8 seconds on standard connections.
- **SC-002**: In vaults with established entities, at least 60% of generated rows incorporate relevant vault entities or sub-table references.
- **SC-003**: 100% of generated rows require explicit user acceptance before persistence to the vault (zero automatic unreviewed commits).
- **SC-004**: Zero degradation or regression to offline table rolling and manual authoring performance.
