# Feature Specification: Oracle RAG Improvements

**Feature Branch**: `019-oracle-rag-improvements`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "oracle rag improvements"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Internal Context Logging (Priority: P1)

As a developer and power user, I want the system to log exactly which files were consulted by the Oracle so that I can debug retrieval quality and understand the data provenance during the development phase.

**Why this priority**: Observability is critical for tuning RAG performance. While hidden from standard users to maintain a clean interface, this data is essential for verification.

**Independent Test**: Send a query to the Oracle; verify that the browser console or internal state reflects the list of entity IDs used as context.

**Acceptance Scenarios**:

1. **Given** a successful Oracle response, **When** I inspect the internal message metadata, **Then** I find a list of source entity IDs.
2. **Given** a context retrieval operation, **When** it completes, **Then** the IDs are persisted in the `ChatMessage` object for audit purposes.

---

### User Story 2 - Neighborhood Context Enrichment (Priority: P2)

As a world builder, I want the Oracle to automatically include the "Chronicle" (summary) of entities linked to the primary search results so that it understands the broader context without overwhelming the token limit with full lore texts.

**Why this priority**: Lore is interconnected. A summary of linked entities provides sufficient "flavor" and relationship context for the AI to give coherent answers.

**Independent Test**: Ask about a location that links to an NPC; verify the Oracle mentions the NPC's role (from their chronicle) even if the NPC's name wasn't in the query.

**Acceptance Scenarios**:

1. **Given** a search result with outbound links, **When** the Oracle retrieves context, **Then** it includes only the `chronicle` field (or a fallback snippet) from the first-degree neighbors.
2. **Given** a large context size, **When** enrichment occurs, **Then** the system MUST prioritize the primary matches over neighbor enrichment to stay within token limits.

---

### User Story 3 - Conversational Query Expansion (Priority: P2)

As a user, I want to ask follow-up questions using pronouns (e.g., "Tell me more about him") and have the Oracle correctly identify the subject from the conversation history for its search.

**Why this priority**: Natural conversation requires understanding context across multiple turns. Currently, search relies heavily on the immediate query text.

**Independent Test**: Ask "Tell me about Eldrin", then ask "What is his favorite drink?"; verify the Oracle correctly retrieves context for Eldrin in the second turn.

**Acceptance Scenarios**:

1. **Given** a conversation history, **When** I send a new query, **Then** the system MUST use the AI to generate a standalone "Search Query" that resolves pronouns and implied subjects.
2. **Given** a high-confidence direct query, **When** expansion occurs, **Then** the expansion should not distort the original intent of the user.

---

### User Story 4 - Deep Fact Retrieval (Priority: P1)

As a lore keeper, I want the Oracle to have access to all sections of an entity (both the main body and the specialized Lore field) so that it can answer questions about specific details (like a named pet or a hidden secret) without hallucinating.

**Why this priority**: Correctness is the baseline for an AI assistant. Hallucinating new facts when the answer exists in the "Lore" field breaks the "Sovereign Data" principle and user trust.

**Independent Test**: ask about a specific detail located only in the "Lore" field of an NPC; verify the Oracle correctly identifies the detail instead of hallucinating.

**Acceptance Scenarios**:

1. **Given** an entity with information split between the markdown body and the `lore` frontmatter field, **When** I query that information, **Then** the Oracle MUST receive both fields as context.
2. **Given** a query for a specific name mentioned only in a `lore` field, **When** search runs, **Then** the system MUST successfully retrieve that entity as a relevant source.

---

### Edge Cases

- **Token Limits**: What happens when the primary context + neighborhood context exceeds the Gemini context window or our 10,000 character truncation limit? (Resolution: Truncate neighbors first, then primary matches).
- **Broken Links**: How does the system handle "Consulted Records" that are linked but do not exist as files? (Resolution: Filter out non-existent entities from the sources list).
- **Ambiguous Pronouns**: How does the expansion handle queries like "What about them?" if multiple entities were mentioned? (Resolution: AI should generate a query that includes all potential subjects).

## Assumptions

- **Lite Tier Capability**: We assume the Gemini "Lite" model is sufficient for reliable query expansion and re-writing.
- **Local Index Freshness**: Retrieval accuracy depends on the FlexSearch index being up to date with the vault files.
- **Connectivity**: Users must be online to use the Oracle features, as expansion and generation require API access.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: **Internal Trace Logging**: System MUST include the IDs of all consulted entities in the `ChatMessage` metadata.

- **FR-002**: **Trace Persistence**: The list of consulted records MUST be persisted in IndexedDB along with the chat history.

- **FR-003**: **Chronicle-Enrichment**: System MUST retrieve and include the `content` field (referred to as the "Chronicle" in the UI) of entities directly linked from the top search results.

- **FR-004**: **Query Re-writing**: System MUST implement a "Query Expansion" step using a lightweight LLM call (lite tier) to transform conversational queries into descriptive search terms.

- **FR-005**: **Context Prioritization**: System MUST prioritize: 1. Selected Entity, 2. Direct Search Matches, 3. Conversationally Identified Subjects, 4. Neighbor Chronicles.
- **FR-006**: **Context Fusion**: System MUST concatenate and include both the markdown `content` AND the frontmatter `lore` field when building the context for an entity.

### Key Entities _(include if feature involves data)_

- **ChatMessage**: Now requires a `sources` field (array of entity IDs) in its metadata for audit/logging.

- **ContextPayload**: Enriched with neighbor summaries (chronicles).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of Oracle assistant messages contain source entity IDs in their internal state.

- **SC-002**: Average context relevance improves for follow-up questions using expansion.

- **SC-003**: Neighborhood enrichment successfully includes linked entity chronicles in at least 80% of "location" queries where inhabitants are defined.

- **SC-004**: Context payload size remains optimized by using chronicles instead of full lore for 1-hop neighbors.
