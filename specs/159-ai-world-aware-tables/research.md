# Research & Architectural Decisions: AI-Generated World-Aware Random Tables

**Feature**: `159-ai-world-aware-tables`  
**Date**: 2026-08-15  
**Spec**: [spec.md](./spec.md)

---

## 1. Vault Entity Grounding & Search Orchestration

### Context & Problem

Generic AI generators produce disconnected generic fantasy tables. To make random tables an authentic lens on the user's campaign world, the generator must include relevant entities (NPCs, factions, locations, lore concepts) without exceeding prompt token budgets or overwhelming the context window on 10,000+ entity vaults.

### Decision

- Use `SearchService` (`@codex/search-orchestrator`) to query the local search index using keywords extracted from the user's prompt and active campaign context.
- Limit retrieved grounding entities to the top 10–15 most relevant entities, formatting them as concise summary items `"{title} ({category}): {summary}"`.
- Apply `extractProperNouns()` and `formatCampaignContextBlock()` from `packages/generator-engine/src/campaign-context.ts` to pin names and ensure user-written guidance strictly outranks default category inferences.

### Rationale

- Reuses existing indexing and ranking infrastructure without duplicating index traversals.
- Slices only relevant lore, keeping model latency under 3–5 seconds and token usage minimal.
- Pinned names in `HIGHEST PRIORITY` blocks prevent the model from renaming existing characters or locations.

### Alternatives Considered

- _Dumping entire vault contents into prompt_: Exceeds token limits on medium/large vaults, degrades generation speed, and causes hallucinations.
- _Blind generation without vault search_: Results in generic trope tables that defeat the entire value proposition of Codex Cryptica.

---

## 2. Nested Sub-Table Reference Discovery & Emission

### Context & Problem

In #2247 (`157-random-tables-decks`), random tables support recursive nested evaluations using `{table_name}` or `{deck_name}` brace tokens. When generating a table (e.g. "Docklands Encounters"), the generator should leverage existing tables (e.g. `{weather_event}` or `{docklands_gangs}`) rather than generating flat literal text.

### Decision

- Query `RandomSourceStore` for all registered table and deck names in the active vault.
- Provide the available table names in the system prompt context as allowable nested reference targets.
- Instruct the model with strict formatting rules: emit `{table_name}` when a slot naturally draws from an existing table; otherwise write descriptive natural text.

### Rationale

- Enables generated tables to naturally connect into the user's existing random content ecosystem.
- Zero parser changes needed: the existing `random-source-engine` resolver already handles `{name}` token replacement and cycle detection.

### Alternatives Considered

- _Post-processing regex replacement of generated text_: Brittle and prone to false positives (e.g., replacing common words that happen to share names with small tables). Explicit LLM generation with provided reference tokens produces far more grammatically cohesive results.

---

## 3. Entity Mention Formatting & Recognition

### Context & Problem

Generated table entries may mention specific NPCs or factions (e.g., "Sera Voight's enforcers collecting extortion fees"). How should these be formatted in the table entry and rendered in roll results?

### Decision

- Emit clean, natural entity names directly in entry text without markdown link syntax (no `[[WikiLinks]]` cluttering the raw text).
- In the roll result renderer (`TableRoller.svelte` / `SourceResultMessage.svelte`), scan result text against the vault's entity title registry to highlight matching entity names as clickable link chips.
- Clicking navigates to the entity or opens the quick inspector.

### Rationale

- Keeps raw table entries human-readable in plain text and exports (CSV, Markdown, VTT tables).
- Eliminates syntax noise while delivering full interactive lore navigation during live play.

### Alternatives Considered

- _Embedding `[[Entity Name]]` in table text_: Clutters plain-text table display and requires special striping when rolled in plain-text contexts.
- _Metadata ID lists on entries_: Hard to keep synchronized if entry text is manually edited later.

---

## 4. Human-in-the-Loop Staging & Preview Workflow

### Context & Problem

Users must never have AI content silently committed to their vault without inspection and approval. We need an intuitive, friction-free way for users to vet candidate rows.

### Decision

- Reusable Candidate Row Staging: The generation dialog returns `CandidateTableEntry[]`.
- Staged rows are presented in an interactive review modal / preview surface where users can:
  - Check/uncheck rows (select all / toggle individual).
  - Edit row text inline.
  - Choose destination: create a brand new table or append to the current active table.
- When generating for a ranged table, contiguous numerical ranges (`1-2`, `3-4`, etc.) are automatically calculated upon row selection.

### Rationale

- Reuses the mental model from #2247 batch importing.
- 100% guarantees user curation and zero unreviewed data commits.

---

## 5. Offline & Graceful Degradation Strategy

### Context & Problem

Codex Cryptica enforces offline-first operation. When offline, or if the user has disabled AI features (`aiDisabled = true`), table authoring must remain completely functional.

### Decision

- If AI is disabled or the client is offline, the "Generate entries" button displays a clear, non-blocking tooltip/disabled state with an explanation.
- Include a deterministic local mock/template generator in `packages/generator-engine` (`generateRandomTableLocal`) for testing, demo mode, and offline scaffolding.

### Rationale

- Satisfies Constitution Principles V (Privacy & Client-Side) and VI (Clean Implementation).
