# Contract: Oracle pinned context

## Message and intent

- `ChatMessage.mentions?: Mention[]` on user messages (see data model).
- `OracleIntent.mentions?: ResolvedMention[]` for chat and query intents. Slash-command intents ignore it.

## Retrieval option

```ts
retrieveContext(query, excludeTitles, vault, lastEntityId?, isImage?, options?: { pinnedEntityIds?: string[] })
```

Behaviour when `pinnedEntityIds` is non-empty:

1. Each id is re-checked: it must exist in `vault.entities` and pass the guest/shared visibility filter. Failing ids are skipped.
2. The first valid id becomes `primaryEntityId`; it overrides `findExplicitSubject` and search ranking.
3. Pinned entities are added in full first, then one-line summaries of their direct connections, then normal search results, all under the existing character cap.
4. `sourceIds` lists pinned ids first.
   When `pinnedEntityIds` is empty or absent, behaviour is unchanged.

## Failure behaviour

A pinned id that fails any check is dropped and the message still sends. No error is shown to the model, and nothing about it is included in context.
