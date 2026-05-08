# Research: AI Regeneration for Entity Descriptions

## Decision: Dual-Output AI Prompting

- **Chosen Approach**: Use a single prompt that requests a structured response (e.g., Markdown with clear headers or JSON) containing both "Chronicle" (player-facing) and "Lore" (GM-facing) sections.
- **Rationale**: Reduces API calls and ensures contextual consistency between the two versions of the lore.
- **Alternatives considered**: Separate calls for Chronicle and Lore (rejected due to latency and potential drift between versions).

## Decision: Read-Only Inline Preview State

- **Chosen Approach**: Store the pending regeneration in a transient `RegenerationService` (Svelte 5 Rune). When active, the `EntityDetailPanel` will overlay the fields with the proposed text and show "Save/Discard" controls.
- **Rationale**: Keeps the `vault` store clean of transient "draft" states and avoids complex undo/redo logic for uncommitted changes.
- **Alternatives considered**: Directly updating the `vault` entity with a `status: 'draft'` (rejected as it would affect all views of the entity and might trigger auto-sync/save).

## Decision: Prompt Context Gathering

- **Chosen Approach**: Gather Name, Labels, Connections, and existing Content/Lore. Connections will be distilled to "Name (Relation)" to minimize token usage while preserving context.
- **Rationale**: Provides maximum relevant context to the AI to ensure continuity with the user's vision.

## Decision: Theme-Aware Generation

- **Chosen Approach**: Pass the `activeTheme.id` and associated jargon to the AI to guide tone and vocabulary.
- **Rationale**: Matches the user's desired aesthetic and makes the AI output feel native to their world.

## Unknowns Resolved

- `lore` storage: Verified as an optional string field in `Entity` schema.
- Zen Mode structure: Located in `EditorToolbar.svelte` (as a toggle) and referenced in `EntityDetailPanel`.
- Existing Oracle patterns: `drafting-engine.ts` already uses `chronicle` and `lore` terminology.
