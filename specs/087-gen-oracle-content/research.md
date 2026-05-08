# Research: Proactive Entity Discovery and Drafting

## Decision: Dual-Path Extraction Strategy

**Rationale**: To maintain the <500ms latency goal, we will use a combination of structured system instructions and a client-side "Detection Engine".

1. **System Instruction Update**: We will update `system-instructions.ts` to encourage the Oracle to use specific markers (e.g., `**Entity Name** as **Type**`) when introducing or describing something new. This doesn't force a full JSON structure on every turn (which is slow and robotic) but provides high-confidence hooks for parsing.
2. **Parallel Parsing**: The `OracleActionExecutor` will run the `parseOracleResponse` on every chunk (or final message) to identify these markers.
3. **Draft Synthesis**: A "Drafting Engine" will be introduced in `packages/oracle-engine` to aggregate details (Lore, Chronicle) across multiple messages in a session.

**Alternatives considered**:

- **Separate AI Call**: Making a second call to Gemini Flash just for extraction. _Rejected_ due to latency and cost (double the tokens).
- **JSON Schema Output**: Forcing the model to always output JSON. _Rejected_ because it ruins the natural conversational "persona" of the Lore Oracle.

## Decision: Incremental Draft Persistence

**Rationale**: Auto-Archive mode requires saving data immediately without blocking the user.

1. **Schema Update**: The `Entity` type in `packages/schema` will be updated with an optional `status: 'active' | 'draft'`.
2. **Vault Filtering**: The `VaultStore` and `GraphEngine` will be updated to exclude `status: 'draft'` entities by default. This prevents "auto-generated clutter" on the main canvas.
3. **Entity Discovery UI**: `ChatMessage.svelte` will render "Detection Chips" for identified entities. Clicking a chip will open the standard Entity Preview with an "Approve/Merge" primary action.

## Decision: User-Controlled Automation Policy

**Rationale**: Automatic node and edge creation can feel intrusive, especially when the Oracle infers relationships from ambiguous prose. Entity persistence and graph mutation should be independently configurable so users can decide how much agency to delegate.

1. **Separate Controls**: Entity Discovery and Connection Discovery will be separate settings. Users may want automatic entity drafts while still reviewing all graph edges.
2. **Safe Defaults**: The default policy will suggest entity and connection discoveries without automatically creating graph edges.
3. **Explicit Auto-Apply**: Connection edges may only be created automatically when the user has selected the `Auto-apply` connection mode.
4. **Feature 040 Reuse**: Suggested connections will continue to use the existing Feature 040 proposal persistence, review, apply, and reject flow.

**Alternatives considered**:

- **Single "Auto-Archive" toggle**: Rejected because it hides the important distinction between saving records and mutating graph relationships.
- **Always auto-apply after manual create/update**: Rejected because clicking "Create entity" is not the same as consenting to inferred connections.

## Decision: Contextual Mapping for Smart Updates

**Rationale**: To achieve 95% precision for updates, we must disambiguate which entity the user is talking about.

1. **Active Entity Context**: The `OracleExecutionContext` already tracks `lastEntityId` and `primaryEntityId`.
2. **Fuzzy Search Integration**: If a name is mentioned but not explicitly linked, the `DraftingEngine` will use the existing `SearchEngine` to find the most likely match before proposing a "Smart Update" instead of a "New Creation".

## Unknowns Resolved

- **Parallel Extraction**: Handled via regex-based parsing of natural language markers in the assistant's response.
- **UI Format**: Detection Chips at the bottom of messages.
- **Auto-Archive**: Handled via a new `status` field in the entity schema.
- **Automation Scope**: Controlled through `OracleAutomationPolicy` with independent entity and connection modes.
