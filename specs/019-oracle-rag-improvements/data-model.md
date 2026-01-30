# Data Model: Oracle RAG Improvements

## Entities

### ChatMessage (Updated)
Represents a single turn in the Oracle conversation.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique UUID |
| role | "user" \| "assistant" | Message origin |
| content | string | Text content |
| sources | string[] (Optional) | Array of entity IDs consulted for this response (FR-001) |
| type | "text" \| "image" | Response format |

### ContextPayload (Internal)
The structure sent to Gemini for inference.

| Field | Type | Description |
|-------|------|-------------|
| expandedQuery | string | The re-written standalone query (FR-004) |
| primaryEntities | LocalEntity[] | Entities matching search query (Full Context Fusion) |
| neighborEntities | ChronicleSnippet[] | Summaries of 1-hop linked entities (FR-003) |

## State Transitions

1. **User Query**: User sends message.
2. **Expansion**: `AIService` calls Lite model to generate `standaloneQuery`.
3. **Retrieval**: `SearchService` finds matches for `standaloneQuery`.
4. **Enrichment**: System crawls outbound links from top matches to find neighbors.
5. **Fusion**: System concatenates `lore` + `content` for all retrieved entities.
6. **Inference**: Final prompt sent to advanced model.
7. **Persistence**: Response saved with `sources` array populated.
