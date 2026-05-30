# Research: Progressive Worker-Backed Search Indexing

## Decision: Reuse The Existing Search Worker

**Rationale**: `@codex/search-engine` already wraps FlexSearch inside a Comlink worker. Extending this package with progress-aware batch operations keeps indexing off the main thread and satisfies the library-first constitution without adding a competing worker model.

**Alternatives considered**: A second worker dedicated to rebuild orchestration was rejected because it would duplicate queueing, persistence boundaries, and FlexSearch ownership. Main-thread batching was rejected because large imports still risk visible UI freezes.

## Decision: Use Service-Owned Run Identity For Cancellation

**Rationale**: Vault switching is an app lifecycle concern. `SearchService` already tracks `activeVaultId`, subscribes to `VAULT:*` events, serializes index writes, and clears the worker on vault transitions. A monotonically unique run ID tied to a vault lets the service ignore stale batch completions and progress events even when worker promises resolve late.

**Alternatives considered**: AbortController transfer into the worker was rejected for the first implementation because Comlink cancellation support is uneven and late result guards are still required. Worker-only cancellation was rejected because the worker does not know which vault is authoritative.

## Decision: Report Progress Through A Typed Callback And Reactive Service State

**Rationale**: Worker-side progress should be emitted after bounded batches, then mirrored by `SearchService` into an observable status object. The search store can expose that status to `SearchModal.svelte` without forcing UI components to know about Comlink or vault events.

**Alternatives considered**: Polling `docCount` was rejected because it cannot represent restoring, failed, cancelled, or partial states. Logging-only progress was rejected because it is not user-facing or testable.

## Decision: Persist Only Successful Per-Vault Snapshots

**Rationale**: Current persistence already stores search index data by `vaultId`. The new flow should save snapshots only after a successful ready state and should treat import errors, incompatible formats, and empty exports as recoverable cold-start rebuilds.

**Alternatives considered**: Persisting partial snapshots was rejected for now because it complicates correctness around entity updates and cancellation. Global snapshots were rejected because they would violate vault isolation.

## Decision: Queue Entity Mutations Against The Active Run

**Rationale**: Entity create, update, and delete events already flow through `SearchService`. During rebuilds, mutations should either apply after the current batch with the same run guard or be replayed before marking the rebuild ready. This preserves consistency without adding a new storage layer.

**Alternatives considered**: Blocking user edits during rebuild was rejected because it harms UX. Ignoring updates until the next full rebuild was rejected because search could remain stale after visible edits.

## Decision: Keep User-Facing Status Plain

**Rationale**: Users need to understand partial results without technical jargon. Status copy should distinguish "ready", "still indexing", "search may be incomplete", and "retry indexing".

**Alternatives considered**: Exposing internal states verbatim was rejected because terms like `restoring` and `partial` are implementation-oriented unless translated in UI copy.
