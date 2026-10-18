# Contract: Adventure Archive Management

Extends `specs/160-solo-adventure-mode/contracts/adventure-storage.md`. Only
the new/changed surface is documented here.

## Repository additions

```ts
interface AdventureSessionRepository {
  // ...Phase 1 methods unchanged (list, load, save, archive,
  //    deleteArchived, deleteUnreadable)...

  rename(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
    title: string,
  ): Promise<AdventureSaveResult>;

  duplicate(
    vaultId: string,
    sessionId: string,
  ): Promise<AdventureDuplicateResult>;
}

type AdventureDuplicateResult =
  | { condition: "duplicated"; id: string }
  | { condition: "unreadable" }
  | { condition: "not-found" };
```

### Guarantees

- `rename` MUST reject an empty or whitespace-only `title` without writing
  (FR-001, Edge Cases).
- `rename` MUST go through the same optimistic-`expectedRevision` check as
  `save`; a stale revision is rejected, not silently overwritten.
- `duplicate` MUST NOT mutate the source document in any way — same
  `revision`, same `updatedAt`, same content, byte-for-byte, before and
  after (SC-002).
- `duplicate` MUST assign the new document a fresh `id`, `createdAt`,
  `updatedAt`, and `revision: 0`, and MUST default `status` to `"archived"`
  regardless of the source's status (a duplicate is never auto-activated;
  the user explicitly resumes it if they want it active, per FR-005).
- `duplicate` of a `duplicate-active-conflict` (Phase 1 read-only recovery
  record, see Edge Cases) MUST succeed and produce a normal, playable
  archived duplicate — the conflict-only restriction applies to the
  original record, not to copies made from it.
- Search/filter (`AdventureListResult` consumers) is a pure, synchronous,
  client-side operation over already-loaded entries; it has no repository
  method of its own and never touches disk.

## Resume-as-active

Resuming an archived (or freshly duplicated) adventure reuses the existing
single-effective-active-adventure machinery from Phase 1
(`AdventureManager` + `adventure-control-coordinator.ts`) rather than adding
a new repository primitive:

1. If an adventure is already active, the user is offered the existing
   Phase 1 continue-or-end choice before resume proceeds (FR-005 explicitly
   requires this).
2. Once clear, the target archived session's `status` is set to `"active"`
   and saved through the existing `save(expectedRevision, session)` path.
3. `AdventureManager` then treats it exactly as it would a freshly continued
   Phase 1 active adventure — no Phase-2-specific play-loop code path is
   introduced.

### Guarantees

- Resuming never duplicates or discards a committed turn (same guarantee
  Phase 1 already provides for ordinary continue).
- Resuming an adventure that turns out to be `unreadable` on load fails
  cleanly with the same Phase 1 unreadable-record handling; it does not
  silently create a new blank session.
