# Research: Connections Proposer

## Background Analysis Strategy

**Decision**: Debounced, event-driven background scans.
**Rationale**: Scanning on every keystroke is too expensive (Gemini cost/rate limits). Scanning only when the entity is opened is "pull" instead of "push".
**Approach**:

1. Watch for `vault.status === 'idle'`.
2. Maintain a "lastScannedTimestamp" per entity.
3. Queue entities for semantic analysis when content changes significantly (> 100 words or new section).

## Semantic Linkage Logic

**Decision**: High-context, batch-based AI prompts.
**Rationale**: Sending every entity pair individually to Gemini is inefficient.
**Approach**:

- Provide Gemini with the "Active Entity" content + a list of "Available Target Titles".
- Prompt: "Identify potential hidden relationships between [Active Entity] and these targets based on current lore."
- Output: Structured JSON with `targetId`, `reason`, and `confidence`.

## Proposal State Management

**Decision**: Dedicated IndexedDB store `proposals`.
**Rationale**: Proposals are high-volume metadata that don't belong in the entity's Markdown file (which should remain clean lore).
**Approach**:

- `id`: `sourceId:targetId` (guarantees uniqueness).
- `status`: `pending` | `accepted` | `rejected`.
- `history`: Circular buffer of 20 items for `rejected` state.

## Worker Implementation

**Decision**: Use a Web Worker for text extraction and local matching.
**Rationale**: Keeps the main thread free for the editor (SC-001).
**Approach**: The worker will handle the "Available Target" filtering and diffing, only calling the AI service when a strong candidate batch is formed.
