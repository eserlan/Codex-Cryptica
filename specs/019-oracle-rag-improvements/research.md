# Research: Oracle RAG Improvements

**Status**: Completed
**Date**: 2026-01-30

## Decision 1: Query Expansion Strategy (FR-004)

**Decision**: Use a "standalone query" generation prompt with Gemini 2.5 Flash Lite before performing the vector/fuzzy search.

**Rationale**: Conversational RAG fails when users use pronouns ("Tell me more about *him*"). By re-writing the user's latest query into a standalone search term that incorporates previous context, we significantly increase the hit rate of `FlexSearch`.

**Alternatives considered**:
- **Direct History Search**: Sending the last 3 messages to the search engine. Rejected because fuzzy search handles conversational filler poorly.
- **Semantic Subject Extraction**: Trying to extract just keywords. Rejected as it loses the nuance of the user's specific intent.

---

## Decision 2: 1-Hop Chronicle Enrichment (FR-003)

**Decision**: Use the existing `inboundConnections` adjacency map and `entities` record to perform a synchronous BFS (depth 1) from the top 3 search results.

**Rationale**: The `VaultStore` already maintains an incremental adjacency map. Accessing `vault.entities[id].content` (referred to as the "Chronicle") is an O(1) operation once the ID is found. Restricting to "Chronicle" (summary) prevents token bloat.

**Alternatives considered**:
- **Full Lore Enrichment**: Including all 1-hop lore. Rejected due to token limits (10k chars).
- **Recursive Enrichment**: Depth 2 or higher. Rejected as it introduces too much noise and risks retrieval drift.

---

## Decision 3: Context Fusion (FR-006)

**Decision**: Implement a `getConsolidatedContext(id: string)` method that returns: `Frontmatter Lore + "\n\n" + Markdown Body`.

**Rationale**: User Story 4 highlights a critical failure where facts in the `lore` field were missed. Concatenation is the simplest and most reliable way to ensure the LLM "sees" both. We will prioritize this consolidated block within the 10k character limit.

---

## Decision 4: Source Persistence (FR-001, FR-002)

**Decision**: Update the `ChatMessage` interface in `oracle.svelte.ts` to include an optional `sources: string[]` field containing entity IDs.

**Rationale**: This allows the UI to stay clean (no visual attribution for now) while providing the necessary data for internal logging and debugging as specified in US1.
